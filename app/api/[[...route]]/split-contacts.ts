import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { and, eq, ilike, inArray, isNull, ne, or } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { users, splitContacts, splitExpenseShares, splitSettlements, accounts, transactions } from '@/db/schema';
import { ensureEnrolled } from '@/lib/split-db';

const app = new Hono()
  // GET /split-contacts — list contacts created by current user (plus auto-backfilled reverse contacts)
  .get('/', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled in bill split' }, 403);

    // Find enrolled users who have added the current user as a contact
    // but the current user hasn't added them back yet — backfill missing reverse contacts
    const reverseRows = await db
      .select({ createdByUserId: splitContacts.createdByUserId })
      .from(splitContacts)
      .where(eq(splitContacts.linkedUserId, auth.userId));

    const reverseUserIds = [...new Set(
      reverseRows.map(r => r.createdByUserId).filter(id => id !== auth.userId)
    )];

    if (reverseUserIds.length > 0) {
      const existing = await db
        .select({ linkedUserId: splitContacts.linkedUserId })
        .from(splitContacts)
        .where(and(
          eq(splitContacts.createdByUserId, auth.userId),
          inArray(splitContacts.linkedUserId, reverseUserIds)
        ));

      const alreadyLinked = new Set(existing.map(r => r.linkedUserId));
      const missing = reverseUserIds.filter(id => !alreadyLinked.has(id));

      if (missing.length > 0) {
        const creators = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, missing));

        // All reverse-contact pairs are created sequentially.
        // The `missing` filter above prevents uniqueness conflicts.
        for (const creator of creators) {
          const [va] = await db
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

          await db.insert(splitContacts).values({
            id: createId(),
            createdByUserId: auth.userId,
            linkedUserId: creator.id,
            email: creator.email,
            name: creator.name,
            virtualAccountId: va.id
          });
        }
      }
    }

    const contacts = await db
      .select({
        id: splitContacts.id,
        name: splitContacts.name,
        email: splitContacts.email,
        linkedUserId: splitContacts.linkedUserId,
        virtualAccountId: splitContacts.virtualAccountId,
        createdAt: splitContacts.createdAt
      })
      .from(splitContacts)
      .where(
        and(
          eq(splitContacts.createdByUserId, auth.userId),
          or(isNull(splitContacts.linkedUserId), ne(splitContacts.linkedUserId, auth.userId))
        )
      )
      .orderBy(splitContacts.name);

    return c.json({ data: contacts });
  })

  // GET /split-contacts/search?email= — search enrolled users by email
  .get(
    '/search',
    zValidator('query', z.object({ email: z.string().min(1) })),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled in bill split' }, 403);

      const { email } = c.req.valid('query');

      const results = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(ilike(users.email, `%${email}%`))
        .limit(10);

      // Filter out self
      const filtered = results.filter(u => u.id !== auth.userId);

      return c.json({ data: filtered });
    }
  )

  // POST /split-contacts — create a contact
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled in bill split' }, 403);

      const { name: inputName, email } = c.req.valid('json');

      let linkedUserId: string | null = null;
      let resolvedName = inputName;

      // If email provided, check if an enrolled user exists with that email
      if (email) {
        const [matchedUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (matchedUser) {
          linkedUserId = matchedUser.id;
          resolvedName = matchedUser.name; // Use their Clerk name
        }
      }

      // Create virtual BILL_SPLIT account + contact row
      const [va] = await db
        .insert(accounts)
        .values({
          id: createId(),
          name: resolvedName,
          userId: auth.userId,
          accountType: 'BILL_SPLIT',
          isHidden: true,
          currency: 'NPR' // default; will be overridden per group
        })
        .returning();

      const [contact] = await db
        .insert(splitContacts)
        .values({
          id: createId(),
          createdByUserId: auth.userId,
          linkedUserId,
          email: email ?? null,
          name: resolvedName,
          virtualAccountId: va.id
        })
        .returning();

      // Auto-create the reverse contact for the enrolled user (B → A) if it doesn't exist
      if (linkedUserId) {
        const [existing] = await db
          .select({ id: splitContacts.id })
          .from(splitContacts)
          .where(and(
            eq(splitContacts.createdByUserId, linkedUserId),
            eq(splitContacts.linkedUserId, auth.userId)
          ))
          .limit(1);

        if (!existing) {
          const [creator] = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, auth.userId))
            .limit(1);

          if (creator) {
            const [reverseVirtualAccount] = await db
              .insert(accounts)
              .values({
                id: createId(),
                name: creator.name,
                userId: linkedUserId,
                accountType: 'BILL_SPLIT',
                isHidden: true,
                currency: 'NPR'
              })
              .returning();

            await db.insert(splitContacts).values({
              id: createId(),
              createdByUserId: linkedUserId,
              linkedUserId: auth.userId,
              email: creator.email,
              name: creator.name,
              virtualAccountId: reverseVirtualAccount.id
            });
          }
        }
      }

      return c.json({ data: contact });
    }
  )

  // PATCH /split-contacts/:id — rename contact (only if not linked to an enrolled user)
  .patch(
    '/:id',
    zValidator('json', z.object({ name: z.string().min(1) })),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

      const { id } = c.req.param();
      const { name } = c.req.valid('json');

      const [contact] = await db
        .select()
        .from(splitContacts)
        .where(and(eq(splitContacts.id, id), eq(splitContacts.createdByUserId, auth.userId)))
        .limit(1);

      if (!contact) return c.json({ error: 'Contact not found' }, 404);
      if (contact.linkedUserId) {
        return c.json({ error: 'Cannot rename an enrolled user — they control their own display name' }, 400);
      }

      // Also update the virtual account name
      if (contact.virtualAccountId) {
        await db.update(accounts).set({ name }).where(eq(accounts.id, contact.virtualAccountId));
      }

      const [updated] = await db
        .update(splitContacts)
        .set({ name })
        .where(eq(splitContacts.id, id))
        .returning();

      return c.json({ data: updated });
    }
  )

  // DELETE /split-contacts/:id
  .delete('/:id', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

    const { id } = c.req.param();

    const [contact] = await db
      .select()
      .from(splitContacts)
      .where(and(eq(splitContacts.id, id), eq(splitContacts.createdByUserId, auth.userId)))
      .limit(1);

    if (!contact) return c.json({ error: 'Contact not found' }, 404);

    // Check if any expense shares reference this contact
    const [shareRef] = await db
      .select({ id: splitExpenseShares.id })
      .from(splitExpenseShares)
      .where(eq(splitExpenseShares.contactId, id))
      .limit(1);

    if (shareRef) {
      return c.json({ error: 'Cannot delete a contact that has expense history' }, 400);
    }

    // Check if any settlements reference this contact
    const [settlementRef] = await db
      .select({ id: splitSettlements.id })
      .from(splitSettlements)
      .where(or(eq(splitSettlements.fromContactId, id), eq(splitSettlements.toContactId, id)))
      .limit(1);

    if (settlementRef) {
      return c.json({ error: 'Cannot delete a contact that has settlement history' }, 400);
    }

    // Delete virtual account only if it has no transactions
    if (contact.virtualAccountId) {
      const [txRef] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.accountId, contact.virtualAccountId))
        .limit(1);

      if (!txRef) {
        await db.delete(accounts).where(eq(accounts.id, contact.virtualAccountId));
      }
    }

    await db.delete(splitContacts).where(eq(splitContacts.id, id));

    return c.json({ data: { id } });
  });

export default app;
