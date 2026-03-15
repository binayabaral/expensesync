import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import {
  SUPPORTED_CURRENCIES,
  splitContacts,
  splitExpenseShares,
  splitExpenses,
  splitGroupMembers,
  splitGroups,
  splitSettlements
} from '@/db/schema';
import {
  batchResolveContacts,
  batchResolveUserNames,
  createGroupVirtualAccount,
  ensureEnrolled
} from '@/lib/split-db';
import { notifyGroupMemberAdded } from '@/lib/split-notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches members for a group and resolves each member's display name in a
 * single batch user-lookup (no N+1).
 */
async function resolveGroupMembers(groupId: string, currentUserId: string) {
  const rawMembers = await db
    .select({
      id: splitGroupMembers.id,
      contactId: splitGroupMembers.contactId,
      userId: splitGroupMembers.userId,
      virtualAccountId: splitGroupMembers.virtualAccountId,
      contactName: splitContacts.name,
      contactEmail: splitContacts.email,
      addedAt: splitGroupMembers.addedAt
    })
    .from(splitGroupMembers)
    .innerJoin(splitContacts, eq(splitGroupMembers.contactId, splitContacts.id))
    .where(eq(splitGroupMembers.groupId, groupId));

  // Batch-resolve all enrolled user names in one query
  const enrolledUserIds = [
    ...new Set(rawMembers.filter(m => m.userId && m.userId !== currentUserId).map(m => m.userId!))
  ];
  const userNameMap = await batchResolveUserNames(enrolledUserIds);

  return rawMembers.map(member => {
    let displayName = member.contactName;
    if (member.userId === currentUserId) {
      displayName = 'You';
    } else if (member.userId && userNameMap.has(member.userId)) {
      displayName = userNameMap.get(member.userId)!;
    }
    return { ...member, displayName, isCurrentUser: member.userId === currentUserId };
  });
}

/**
 * Verifies the user is either the group creator or a member.
 * Returns the group if access is granted, or null otherwise.
 */
async function getGroupWithAccess(groupId: string, userId: string) {
  const [group] = await db
    .select()
    .from(splitGroups)
    .where(eq(splitGroups.id, groupId))
    .limit(1);

  if (!group) return null;

  const isCreator = group.createdByUserId === userId;
  if (isCreator) return group;

  const [membership] = await db
    .select({ id: splitGroupMembers.id })
    .from(splitGroupMembers)
    .where(and(eq(splitGroupMembers.groupId, groupId), eq(splitGroupMembers.userId, userId)))
    .limit(1);

  return membership ? group : null;
}

const app = new Hono()
  // GET / — list groups where user is creator or member
  .get('/', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    // Gather all group IDs the user belongs to (as creator or member)
    const [createdGroups, memberGroupRows] = await Promise.all([
      db.select({ id: splitGroups.id }).from(splitGroups).where(eq(splitGroups.createdByUserId, auth.userId)),
      db.select({ groupId: splitGroupMembers.groupId }).from(splitGroupMembers).where(eq(splitGroupMembers.userId, auth.userId))
    ]);

    const allGroupIds = [
      ...new Set([
        ...createdGroups.map(g => g.id),
        ...memberGroupRows.map(g => g.groupId)
      ])
    ];

    if (allGroupIds.length === 0) return c.json({ data: [] });

    const groups = await db
      .select()
      .from(splitGroups)
      .where(inArray(splitGroups.id, allGroupIds));

    // Batch-fetch ALL members for ALL groups in a single query (eliminates N+1)
    const allRawMembers = await db
      .select({
        groupId: splitGroupMembers.groupId,
        id: splitGroupMembers.id,
        contactId: splitGroupMembers.contactId,
        userId: splitGroupMembers.userId,
        virtualAccountId: splitGroupMembers.virtualAccountId,
        contactName: splitContacts.name,
        contactEmail: splitContacts.email,
        addedAt: splitGroupMembers.addedAt
      })
      .from(splitGroupMembers)
      .innerJoin(splitContacts, eq(splitGroupMembers.contactId, splitContacts.id))
      .where(inArray(splitGroupMembers.groupId, allGroupIds));

    // Single name resolution pass for all enrolled members across all groups
    const allEnrolledUserIds = [
      ...new Set(
        allRawMembers
          .filter(m => m.userId && m.userId !== auth.userId)
          .map(m => m.userId!)
      )
    ];
    const userNameMap = await batchResolveUserNames(allEnrolledUserIds);

    // Group members by groupId in memory
    const membersByGroup = new Map<string, typeof allRawMembers>();
    for (const m of allRawMembers) {
      const list = membersByGroup.get(m.groupId) ?? [];
      list.push(m);
      membersByGroup.set(m.groupId, list);
    }

    const groupsWithMeta = groups.map(group => {
      const rawMembers = membersByGroup.get(group.id) ?? [];
      const members = rawMembers.map(member => {
        let displayName = member.contactName;
        if (member.userId === auth.userId) {
          displayName = 'You';
        } else if (member.userId && userNameMap.has(member.userId)) {
          displayName = userNameMap.get(member.userId)!;
        }
        return { ...member, displayName, isCurrentUser: member.userId === auth.userId };
      });
      return { ...group, members };
    });

    return c.json({ data: groupsWithMeta });
  })

  // GET /:id — group detail
  .get('/:id', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const { id } = c.req.param();
    const group = await getGroupWithAccess(id, auth.userId);
    if (!group) return c.json({ error: 'Group not found or access denied' }, 404);

    const members = await resolveGroupMembers(id, auth.userId);
    return c.json({ data: { ...group, members } });
  })

  // POST / — create group
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        currency: z.enum(SUPPORTED_CURRENCIES).optional(),
        simplifyDebts: z.boolean().optional(),
        memberContactIds: z.array(z.string()).optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { name, description, currency = 'NPR', simplifyDebts = true, memberContactIds = [] } = c.req.valid('json');

      // Pre-fetch contacts outside the transaction (read-only)
      const memberContacts = memberContactIds.length > 0
        ? await db.select().from(splitContacts).where(inArray(splitContacts.id, memberContactIds))
        : [];

      // All writes (group + virtual accounts + contacts + members) are atomic
      const group = await db.transaction(async (tx) => {
        const [group] = await tx
          .insert(splitGroups)
          .values({
            id: createId(),
            createdByUserId: auth.userId,
            name,
            description: description ?? null,
            currency,
            simplifyDebts
          })
          .returning();

        // Create a virtual account for the creator and a self-contact row
        const creatorVirtualAccount = await createGroupVirtualAccount(auth.userId, name, currency, tx);
        const [selfContact] = await tx
          .insert(splitContacts)
          .values({
            id: createId(),
            createdByUserId: auth.userId,
            linkedUserId: auth.userId,
            email: null,
            name: 'You',
            virtualAccountId: creatorVirtualAccount.id
          })
          .returning();

        await tx.insert(splitGroupMembers).values({
          id: createId(),
          groupId: group.id,
          contactId: selfContact.id,
          userId: auth.userId,
          virtualAccountId: creatorVirtualAccount.id
        });

        for (const contact of memberContacts) {
          let memberVirtualAccountId: string | null = null;
          if (contact.linkedUserId) {
            const va = await createGroupVirtualAccount(contact.linkedUserId, name, currency, tx);
            memberVirtualAccountId = va.id;
          }

          await tx.insert(splitGroupMembers).values({
            id: createId(),
            groupId: group.id,
            contactId: contact.id,
            userId: contact.linkedUserId ?? null,
            virtualAccountId: memberVirtualAccountId
          });
        }

        return group;
      });

      // Notifications are side-effects — run outside the transaction
      for (const contact of memberContacts) {
        await notifyGroupMemberAdded({ id: group.id, name: group.name }, contact.linkedUserId);
      }

      return c.json({ data: group });
    }
  )

  // PATCH /:id — edit group
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        simplifyDebts: z.boolean().optional(),
        isArchived: z.boolean().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { id } = c.req.param();
      const values = c.req.valid('json');

      const group = await getGroupWithAccess(id, auth.userId);
      if (!group) return c.json({ error: 'Group not found or access denied' }, 404);

      const [updated] = await db
        .update(splitGroups)
        .set(values)
        .where(eq(splitGroups.id, id))
        .returning();

      return c.json({ data: updated });
    }
  )

  // POST /:id/members — add one or more members to group
  .post(
    '/:id/members',
    zValidator('json', z.object({ contactIds: z.array(z.string()).min(1) })),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { id: groupId } = c.req.param();
      const { contactIds } = c.req.valid('json');

      const group = await getGroupWithAccess(groupId, auth.userId);
      if (!group) return c.json({ error: 'Group not found or access denied' }, 404);

      const contacts = await db
        .select()
        .from(splitContacts)
        .where(and(inArray(splitContacts.id, contactIds), eq(splitContacts.createdByUserId, auth.userId)));

      // All virtual account + member inserts are atomic
      const members = await db.transaction(async (tx) => {
        return Promise.all(
          contacts.map(async contact => {
            let memberVirtualAccountId: string | null = null;
            if (contact.linkedUserId) {
              const va = await createGroupVirtualAccount(contact.linkedUserId, group.name, group.currency, tx);
              memberVirtualAccountId = va.id;
            }

            const [member] = await tx
              .insert(splitGroupMembers)
              .values({
                id: createId(),
                groupId,
                contactId: contact.id,
                userId: contact.linkedUserId ?? null,
                virtualAccountId: memberVirtualAccountId
              })
              .returning();

            return member;
          })
        );
      });

      // Notifications outside the transaction
      for (const contact of contacts) {
        await notifyGroupMemberAdded({ id: group.id, name: group.name }, contact.linkedUserId);
      }

      return c.json({ data: members });
    }
  )

  // GET /:id/balances — per-member net balance for current user within this group
  .get('/:id/balances', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const { id: groupId } = c.req.param();

    const group = await getGroupWithAccess(groupId, auth.userId);
    if (!group) return c.json({ error: 'Group not found or access denied' }, 404);

    // Build balance map keyed by userId (enrolled) or contactId (pending).
    const balanceMap = new Map<string, { displayName: string; netAmount: number; contactId: string }>();
    const rawMembers = await db
      .select({ contactId: splitGroupMembers.contactId, userId: splitGroupMembers.userId, contactName: splitContacts.name })
      .from(splitGroupMembers)
      .innerJoin(splitContacts, eq(splitGroupMembers.contactId, splitContacts.id))
      .where(eq(splitGroupMembers.groupId, groupId));

    const enrolledMemberUserIds = [
      ...new Set(rawMembers.filter(m => m.userId && m.userId !== auth.userId).map(m => m.userId!))
    ];
    const memberNameMap = await batchResolveUserNames(enrolledMemberUserIds);

    for (const m of rawMembers) {
      if (m.userId === auth.userId) continue;
      const mapKey = m.userId ?? m.contactId;
      const displayName = m.userId
        ? (memberNameMap.get(m.userId) ?? m.contactName)
        : m.contactName;
      balanceMap.set(mapKey, { displayName, netAmount: 0, contactId: m.contactId });
    }

    // ── SIMPLIFY DEBTS: compute global net positions for all members, then run
    //    greedy min-transactions algorithm (Splitwise-style).
    if (group.simplifyDebts) {
      const [allExpenseData, allSettlementsData] = await Promise.all([
        db
          .select({
            expenseId: splitExpenses.id,
            createdByUserId: splitExpenses.createdByUserId,
            paidByUser: splitExpenses.paidByUser,
            paidByContactId: splitExpenses.paidByContactId,
            shareIsUser: splitExpenseShares.isUser,
            shareContactId: splitExpenseShares.contactId,
            shareAmount: splitExpenseShares.shareAmount
          })
          .from(splitExpenses)
          .innerJoin(splitExpenseShares, eq(splitExpenseShares.expenseId, splitExpenses.id))
          .where(eq(splitExpenses.groupId, groupId)),
        db
          .select({
            createdByUserId: splitSettlements.createdByUserId,
            fromIsUser: splitSettlements.fromIsUser,
            toIsUser: splitSettlements.toIsUser,
            fromContactId: splitSettlements.fromContactId,
            toContactId: splitSettlements.toContactId,
            amount: splitSettlements.amount
          })
          .from(splitSettlements)
          .where(eq(splitSettlements.groupId, groupId))
      ]);

      const globalContactIdSet = new Set<string>();
      for (const r of allExpenseData) {
        if (r.paidByContactId) globalContactIdSet.add(r.paidByContactId);
        if (r.shareContactId) globalContactIdSet.add(r.shareContactId);
      }
      for (const s of allSettlementsData) {
        if (s.fromContactId) globalContactIdSet.add(s.fromContactId);
        if (s.toContactId) globalContactIdSet.add(s.toContactId);
      }
      const globalContactMap = await batchResolveContacts([...globalContactIdSet]);
      const resolveContactKey = (contactId: string) =>
        globalContactMap.get(contactId)?.linkedUserId ?? contactId;

      // Global net: positive = others owe this member, negative = this member owes others
      const globalNet = new Map<string, number>();
      for (const m of rawMembers) globalNet.set(m.userId ?? m.contactId, 0);

      // Group expense rows by expenseId
      const expenseGrouped = new Map<string, {
        createdByUserId: string;
        paidByUser: boolean;
        paidByContactId: string | null;
        shares: { isUser: boolean; contactId: string | null; shareAmount: number }[];
      }>();
      for (const row of allExpenseData) {
        if (!expenseGrouped.has(row.expenseId)) {
          expenseGrouped.set(row.expenseId, {
            createdByUserId: row.createdByUserId,
            paidByUser: row.paidByUser,
            paidByContactId: row.paidByContactId,
            shares: []
          });
        }
        expenseGrouped.get(row.expenseId)!.shares.push({
          isUser: row.shareIsUser,
          contactId: row.shareContactId,
          shareAmount: row.shareAmount
        });
      }

      for (const [, expense] of expenseGrouped) {
        const payerKey = expense.paidByUser
          ? expense.createdByUserId
          : expense.paidByContactId
            ? resolveContactKey(expense.paidByContactId)
            : expense.createdByUserId;

        for (const share of expense.shares) {
          const ownerKey = share.isUser
            ? expense.createdByUserId
            : share.contactId ? resolveContactKey(share.contactId) : null;
          if (!ownerKey || ownerKey === payerKey) continue;
          globalNet.set(payerKey, (globalNet.get(payerKey) ?? 0) + share.shareAmount);
          globalNet.set(ownerKey, (globalNet.get(ownerKey) ?? 0) - share.shareAmount);
        }
      }

      for (const s of allSettlementsData) {
        const fromKey = s.fromIsUser
          ? s.createdByUserId
          : s.fromContactId ? resolveContactKey(s.fromContactId) : null;
        const toKey = s.toIsUser
          ? s.createdByUserId
          : s.toContactId ? resolveContactKey(s.toContactId) : null;
        if (!fromKey || !toKey) continue;
        globalNet.set(fromKey, (globalNet.get(fromKey) ?? 0) + s.amount);
        globalNet.set(toKey, (globalNet.get(toKey) ?? 0) - s.amount);
      }

      // Greedy minimum-transactions algorithm
      const creditors: { key: string; amount: number }[] = [];
      const debtors: { key: string; amount: number }[] = [];
      for (const [key, net] of globalNet) {
        if (net > 1) creditors.push({ key, amount: net });
        else if (net < -1) debtors.push({ key, amount: -net });
      }
      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      const simplifiedDebts: { from: string; to: string; amount: number }[] = [];
      let ci = 0, di = 0;
      while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const amount = Math.min(creditor.amount, debtor.amount);
        if (amount > 0) simplifiedDebts.push({ from: debtor.key, to: creditor.key, amount });
        creditor.amount -= amount;
        debtor.amount -= amount;
        if (creditor.amount < 1) ci++;
        if (debtor.amount < 1) di++;
      }

      // Build current user's perspective from simplified debts
      const keyToContactId = new Map(rawMembers.map(m => [m.userId ?? m.contactId, m.contactId]));
      const simplifiedMemberNet = new Map<string, number>(); // contactId → net

      for (const debt of simplifiedDebts) {
        if (debt.from === auth.userId) {
          const cid = keyToContactId.get(debt.to);
          if (cid) simplifiedMemberNet.set(cid, (simplifiedMemberNet.get(cid) ?? 0) - debt.amount);
        } else if (debt.to === auth.userId) {
          const cid = keyToContactId.get(debt.from);
          if (cid) simplifiedMemberNet.set(cid, (simplifiedMemberNet.get(cid) ?? 0) + debt.amount);
        }
      }

      const simplifiedBalances = rawMembers
        .filter(m => m.userId !== auth.userId)
        .map(m => ({
          contactId: m.contactId,
          displayName: m.userId ? (memberNameMap.get(m.userId) ?? m.contactName) : m.contactName,
          netAmount: simplifiedMemberNet.get(m.contactId) ?? 0
        }));

      return c.json({ data: simplifiedBalances });
    }

    // Pre-collect all contactIds that will need linking → batch-resolve once
    // ── CASE 1: user paid expenses in this group → others owe user their shares
    const userPaidShares = await db
      .select({ shareAmount: splitExpenseShares.shareAmount, contactId: splitExpenseShares.contactId })
      .from(splitExpenseShares)
      .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
      .where(and(
        eq(splitExpenses.groupId, groupId),
        eq(splitExpenses.createdByUserId, auth.userId),
        eq(splitExpenses.paidByUser, true),
        eq(splitExpenseShares.isUser, false),
        isNotNull(splitExpenseShares.contactId)
      ));

    // ── CASE 2: user's own expense, contact paid → user owes that contact
    const userOwesShares = await db
      .select({ shareAmount: splitExpenseShares.shareAmount, paidByContactId: splitExpenses.paidByContactId })
      .from(splitExpenseShares)
      .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
      .where(and(
        eq(splitExpenses.groupId, groupId),
        eq(splitExpenses.createdByUserId, auth.userId),
        eq(splitExpenseShares.isUser, true),
        isNotNull(splitExpenses.paidByContactId)
      ));

    // Collect all contactIds from cases 1 & 2 and batch-resolve their linkedUserIds
    const contactIdsToResolve = [
      ...new Set([
        ...userPaidShares.map(s => s.contactId!),
        ...userOwesShares.map(s => s.paidByContactId!).filter(Boolean)
      ])
    ];
    const contactResolutionMap = await batchResolveContacts(contactIdsToResolve);

    const resolveKey = (contactId: string) =>
      contactResolutionMap.get(contactId)?.linkedUserId ?? contactId;

    for (const s of userPaidShares) {
      if (!s.contactId) continue;
      const key = resolveKey(s.contactId);
      const entry = balanceMap.get(key);
      if (entry) entry.netAmount += s.shareAmount;
    }

    for (const s of userOwesShares) {
      if (!s.paidByContactId) continue;
      const key = resolveKey(s.paidByContactId);
      const entry = balanceMap.get(key);
      if (entry) entry.netAmount -= s.shareAmount;
    }

    // ── CASE 3: current user is a participant in someone else's expense
    const userContacts = await db
      .select({ id: splitContacts.id })
      .from(splitContacts)
      .where(eq(splitContacts.linkedUserId, auth.userId));
    const userContactIds = userContacts.map(c => c.id);

    if (userContactIds.length > 0) {
      // Join expense details directly — eliminates N+1 per-share expense lookup
      const participantShares = await db
        .select({
          shareAmount: splitExpenseShares.shareAmount,
          expenseId: splitExpenseShares.expenseId,
          paidByUser: splitExpenses.paidByUser,
          createdByUserId: splitExpenses.createdByUserId,
          paidByContactId: splitExpenses.paidByContactId
        })
        .from(splitExpenseShares)
        .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
        .where(and(
          eq(splitExpenses.groupId, groupId),
          inArray(splitExpenseShares.contactId, userContactIds)
        ));

      // Batch-resolve payer contacts for the "paidByContactId" case
      const payerContactIds = [
        ...new Set(participantShares.filter(s => s.paidByContactId).map(s => s.paidByContactId!))
      ];
      const payerContactMap = await batchResolveContacts(payerContactIds);

      // For expenses where the current user was the payer (via contact), we need the
      // creator's (isUser=true) share amount — batch these by expenseId
      const expenseIdsWhereIPaid = participantShares
        .filter(s => {
          if (!s.paidByContactId) return false;
          const pc = payerContactMap.get(s.paidByContactId);
          return pc?.linkedUserId === auth.userId;
        })
        .map(s => s.expenseId);

      const creatorShareMap = new Map<string, number>();
      if (expenseIdsWhereIPaid.length > 0) {
        const creatorShares = await db
          .select({ expenseId: splitExpenseShares.expenseId, shareAmount: splitExpenseShares.shareAmount })
          .from(splitExpenseShares)
          .where(and(
            inArray(splitExpenseShares.expenseId, expenseIdsWhereIPaid),
            eq(splitExpenseShares.isUser, true)
          ));
        for (const cs of creatorShares) creatorShareMap.set(cs.expenseId, cs.shareAmount);
      }

      for (const s of participantShares) {
        if (s.createdByUserId === auth.userId) continue;

        if (s.paidByUser) {
          // Creator paid → current user owes creator their share
          const entry = balanceMap.get(s.createdByUserId);
          if (entry) entry.netAmount -= s.shareAmount;
        } else if (s.paidByContactId) {
          const payerContact = payerContactMap.get(s.paidByContactId);
          if (payerContact?.linkedUserId === auth.userId) {
            // Current user paid via their contact → creator owes user the creator's own share
            const creatorShare = creatorShareMap.get(s.expenseId);
            if (creatorShare != null) {
              const entry = balanceMap.get(s.createdByUserId);
              if (entry) entry.netAmount += creatorShare;
            }
          } else {
            // A third party paid → current user owes the payer
            const payerKey = payerContact?.linkedUserId ?? s.paidByContactId;
            const entry = balanceMap.get(payerKey);
            if (entry) entry.netAmount -= s.shareAmount;
          }
        }
      }
    }

    // ── CASE 4: group-scoped settlements — count both own and cross-user entries

    // Own: current user paid a contact
    const settlementsFromUser = await db
      .select({ amount: splitSettlements.amount, toContactId: splitSettlements.toContactId })
      .from(splitSettlements)
      .where(and(
        eq(splitSettlements.createdByUserId, auth.userId),
        eq(splitSettlements.groupId, groupId),
        eq(splitSettlements.fromIsUser, true),
        isNotNull(splitSettlements.toContactId)
      ));

    // Own: a contact paid the current user
    const settlementsToUser = await db
      .select({ amount: splitSettlements.amount, fromContactId: splitSettlements.fromContactId })
      .from(splitSettlements)
      .where(and(
        eq(splitSettlements.createdByUserId, auth.userId),
        eq(splitSettlements.groupId, groupId),
        eq(splitSettlements.toIsUser, true),
        isNotNull(splitSettlements.fromContactId)
      ));

    // Batch-resolve settlement contact IDs
    const settlementContactIds = [
      ...new Set([
        ...settlementsFromUser.map(s => s.toContactId!).filter(Boolean),
        ...settlementsToUser.map(s => s.fromContactId!).filter(Boolean)
      ])
    ];
    const settlementContactMap = await batchResolveContacts(settlementContactIds);

    for (const s of settlementsFromUser) {
      if (!s.toContactId) continue;
      const key = settlementContactMap.get(s.toContactId)?.linkedUserId ?? s.toContactId;
      const entry = balanceMap.get(key);
      if (entry) entry.netAmount += s.amount;
    }

    for (const s of settlementsToUser) {
      if (!s.fromContactId) continue;
      const key = settlementContactMap.get(s.fromContactId)?.linkedUserId ?? s.fromContactId;
      const entry = balanceMap.get(key);
      if (entry) entry.netAmount -= s.amount;
    }

    // Cross-user settlements involving the current user
    if (userContactIds.length > 0) {
      const [othersPayingMe, mePaying] = await Promise.all([
        db.select({ amount: splitSettlements.amount, createdByUserId: splitSettlements.createdByUserId })
          .from(splitSettlements)
          .where(and(
            eq(splitSettlements.groupId, groupId),
            eq(splitSettlements.fromIsUser, true),
            inArray(splitSettlements.toContactId, userContactIds)
          )),
        db.select({ amount: splitSettlements.amount, createdByUserId: splitSettlements.createdByUserId })
          .from(splitSettlements)
          .where(and(
            eq(splitSettlements.groupId, groupId),
            eq(splitSettlements.toIsUser, true),
            inArray(splitSettlements.fromContactId, userContactIds)
          ))
      ]);

      for (const s of othersPayingMe) {
        if (s.createdByUserId === auth.userId) continue;
        const entry = balanceMap.get(s.createdByUserId);
        if (entry) entry.netAmount -= s.amount; // they paid me → they owe me less
      }

      for (const s of mePaying) {
        if (s.createdByUserId === auth.userId) continue;
        const entry = balanceMap.get(s.createdByUserId);
        if (entry) entry.netAmount += s.amount; // I paid them → I owe them less
      }
    }

    const balances = Array.from(balanceMap.values()).map(({ displayName, netAmount, contactId }) => ({
      contactId,
      displayName,
      netAmount
    }));

    return c.json({ data: balances });
  })

  // DELETE /:id — delete group (creator only)
  .delete('/:id', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const { id } = c.req.param();

    const [group] = await db.select().from(splitGroups).where(eq(splitGroups.id, id)).limit(1);
    if (!group) return c.json({ error: 'Group not found' }, 404);
    if (group.createdByUserId !== auth.userId) return c.json({ error: 'Only the creator can delete a group' }, 403);

    // Block deletion if the group has any expenses or settlements
    const [expenseCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(splitExpenses)
      .where(eq(splitExpenses.groupId, id));
    const [settlementCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(splitSettlements)
      .where(eq(splitSettlements.groupId, id));

    if (Number(expenseCount.count) > 0 || Number(settlementCount.count) > 0) {
      return c.json({ error: 'Groups with expenses or settlements cannot be deleted. Archive the group instead.' }, 409);
    }

    await db.delete(splitGroups).where(eq(splitGroups.id, id));

    return c.json({ data: { id } });
  });

export default app;
