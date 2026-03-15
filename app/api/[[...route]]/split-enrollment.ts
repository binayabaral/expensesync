import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createClerkClient } from '@clerk/backend';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

import { db } from '@/db/drizzle';
import { users, splitContacts, splitGroupMembers, splitGroups, accounts } from '@/db/schema';
import { createGroupVirtualAccount } from '@/lib/split-db';

const app = new Hono()
  .get('/', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

    const [enrolled] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);

    return c.json({ data: { enrolled: !!enrolled, user: enrolled ?? null } });
  })
  .post('/', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

    // Check if already enrolled
    const [existing] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
    if (existing) return c.json({ data: { enrolled: true, user: existing } });

    // Fetch user info from Clerk
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUser = await clerk.users.getUser(auth.userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.username ||
      email;

    // All DB writes are atomic — user row + contact linking + membership upgrades + reverse contacts
    const newUser = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({ id: auth.userId, email, name })
        .returning();

      // Resolve pending contacts with this email → link them + update name
      if (email) {
        const pendingContacts = await tx
          .select({ id: splitContacts.id })
          .from(splitContacts)
          .where(and(eq(splitContacts.email, email), isNull(splitContacts.linkedUserId)));

        if (pendingContacts.length > 0) {
          const pendingContactIds = pendingContacts.map(c => c.id);

          // Link all pending contacts in one update
          await tx
            .update(splitContacts)
            .set({ linkedUserId: auth.userId, name })
            .where(and(eq(splitContacts.email, email), isNull(splitContacts.linkedUserId)));

          // Batch-fetch all pending group memberships across all linked contacts at once
          const memberships = await tx
            .select()
            .from(splitGroupMembers)
            .where(and(
              inArray(splitGroupMembers.contactId, pendingContactIds),
              isNull(splitGroupMembers.userId)
            ));

          if (memberships.length > 0) {
            // Batch-fetch the groups needed to get name + currency for virtual account creation
            const groupIds = [...new Set(memberships.map(m => m.groupId))];
            const groups = await tx
              .select()
              .from(splitGroups)
              .where(inArray(splitGroups.id, groupIds));
            const groupMap = new Map(groups.map(g => [g.id, g]));

            // Create a virtual BILL_SPLIT account for each membership and update the record
            for (const membership of memberships) {
              const group = groupMap.get(membership.groupId);
              if (!group) continue;

              const virtualAccount = await createGroupVirtualAccount(auth.userId, group.name, group.currency, tx);
              await tx
                .update(splitGroupMembers)
                .set({ userId: auth.userId, virtualAccountId: virtualAccount.id })
                .where(eq(splitGroupMembers.id, membership.id));
            }
          }
        }
      }

      // Auto-create reverse contacts: for each user who had added the new user as a contact,
      // create a contact entry in the new user's contact list (if it doesn't exist yet)
      const contactsPointingToMe = await tx
        .select({ createdByUserId: splitContacts.createdByUserId })
        .from(splitContacts)
        .where(eq(splitContacts.linkedUserId, auth.userId));

      const creatorIds = [...new Set(contactsPointingToMe.map(c => c.createdByUserId).filter(id => id !== auth.userId))];

      if (creatorIds.length > 0) {
        const [existingReverse, creators] = await Promise.all([
          tx.select({ linkedUserId: splitContacts.linkedUserId })
            .from(splitContacts)
            .where(and(eq(splitContacts.createdByUserId, auth.userId), inArray(splitContacts.linkedUserId, creatorIds))),
          tx.select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(inArray(users.id, creatorIds))
        ]);

        const alreadyLinked = new Set(existingReverse.map(r => r.linkedUserId));
        const creatorsToAdd = creators.filter(c => !alreadyLinked.has(c.id));

        for (const creator of creatorsToAdd) {
          const [reverseVirtualAccount] = await tx
            .insert(accounts)
            .values({
              id: createId(),
              name: creator.name,
              userId: auth.userId,
              accountType: 'BILL_SPLIT',
              isHidden: true,
              currency: 'NPR'
            })
            .returning();

          await tx.insert(splitContacts).values({
            id: createId(),
            createdByUserId: auth.userId,
            linkedUserId: creator.id,
            email: creator.email,
            name: creator.name,
            virtualAccountId: reverseVirtualAccount.id
          });
        }
      }

      return newUser;
    });

    return c.json({ data: { enrolled: true, user: newUser } });
  });

export default app;
