import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import {
  SUPPORTED_CURRENCIES,
  splitContacts,
  splitExpenseShares,
  splitExpenses,
  splitGroupMembers,
  splitGroups,
  transactions
} from '@/db/schema';
import { batchResolveUserNames, ensureEnrolled } from '@/lib/split-db';
import { notifyExpenseCreated } from '@/lib/split-notifications';

const shareSchema = z.object({
  contactId: z.string().nullable().optional(), // null = user's own share
  isUser: z.boolean(),
  splitValue: z.number()
});

const createExpenseSchema = z.object({
  groupId: z.string().nullable().optional(),
  description: z.string().min(1),
  totalAmount: z.number().int().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  date: z.coerce.date(),
  paidByContactId: z.string().nullable().optional(),
  paidByUser: z.boolean().default(false),
  categoryId: z.string().nullable().optional(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  notes: z.string().nullable().optional(),
  shares: z.array(shareSchema).min(2)
});

const recordShareSchema = z.object({
  categoryId: z.string().nullable().optional(),
  date: z.coerce.date(),
  actualAccountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

function calculateShares(
  totalAmount: number,
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES',
  participants: { isUser: boolean; contactId?: string | null; splitValue: number }[]
): { isUser: boolean; contactId: string | null; splitValue: number; shareAmount: number }[] {
  const count = participants.length;

  if (splitType === 'EQUAL') {
    const base = Math.floor(totalAmount / count);
    const remainder = totalAmount - base * count;
    return participants.map((p, i) => ({
      ...p,
      contactId: p.contactId ?? null,
      shareAmount: base + (i < remainder ? 1 : 0)
    }));
  }

  if (splitType === 'EXACT') {
    return participants.map(p => ({
      ...p,
      contactId: p.contactId ?? null,
      shareAmount: Math.round(p.splitValue * 1000)
    }));
  }

  if (splitType === 'PERCENTAGE') {
    // Use floor+remainder to guarantee sum === totalAmount (no penny gap)
    const floors = participants.map(p => Math.floor((totalAmount * p.splitValue) / 100));
    const remainder = totalAmount - floors.reduce((s, a) => s + a, 0);
    return participants.map((p, i) => ({
      ...p,
      contactId: p.contactId ?? null,
      shareAmount: floors[i] + (i < remainder ? 1 : 0)
    }));
  }

  // SHARES — same floor+remainder pattern
  const totalShares = participants.reduce((sum, p) => sum + p.splitValue, 0);
  const floors = participants.map(p => Math.floor((totalAmount * p.splitValue) / totalShares));
  const remainder = totalAmount - floors.reduce((s, a) => s + a, 0);
  return participants.map((p, i) => ({
    ...p,
    contactId: p.contactId ?? null,
    shareAmount: floors[i] + (i < remainder ? 1 : 0)
  }));
}

async function getUserVirtualAccountForContext(
  userId: string,
  groupId: string | null | undefined,
  paidByContactId: string | null | undefined
): Promise<string | null> {
  if (groupId) {
    const [member] = await db
      .select({ virtualAccountId: splitGroupMembers.virtualAccountId })
      .from(splitGroupMembers)
      .where(and(eq(splitGroupMembers.groupId, groupId), eq(splitGroupMembers.userId, userId)))
      .limit(1);
    return member?.virtualAccountId ?? null;
  }

  // Standalone — use the contact's virtual account (the payer's contact account, from user's side)
  // For standalone, find the contact that represents the other party
  if (paidByContactId) {
    // Contact paid → user's share is owed to that contact → use that contact's virtual account
    const [contact] = await db
      .select({ virtualAccountId: splitContacts.virtualAccountId })
      .from(splitContacts)
      .where(eq(splitContacts.id, paidByContactId))
      .limit(1);
    return contact?.virtualAccountId ?? null;
  }

  // User paid standalone — use first non-user contact's virtual account
  return null;
}

const app = new Hono()
  // GET / — standalone expenses (no groupId), group expenses (?groupId=), or all (?all=true)
  .get('/', zValidator('query', z.object({ groupId: z.string().optional(), all: z.string().optional() })), async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const { groupId, all } = c.req.valid('query');

    let whereCondition;
    if (groupId) {
      // Group expenses — user must be creator or member (no contact lookup needed)
      const [group] = await db.select().from(splitGroups).where(eq(splitGroups.id, groupId)).limit(1);
      if (!group) return c.json({ error: 'Group not found' }, 404);
      const isCreator = group.createdByUserId === auth.userId;
      const [membership] = await db
        .select()
        .from(splitGroupMembers)
        .where(and(eq(splitGroupMembers.groupId, groupId), eq(splitGroupMembers.userId, auth.userId)))
        .limit(1);
      if (!isCreator && !membership) return c.json({ error: 'Access denied' }, 403);
      whereCondition = eq(splitExpenses.groupId, groupId);
    } else if (all === 'true') {
      // All expenses — fetch group memberships and contact IDs in parallel
      const [memberGroupRows, userContactRows] = await Promise.all([
        db.select({ groupId: splitGroupMembers.groupId })
          .from(splitGroupMembers)
          .where(eq(splitGroupMembers.userId, auth.userId)),
        db.select({ id: splitContacts.id })
          .from(splitContacts)
          .where(eq(splitContacts.linkedUserId, auth.userId))
      ]);
      const memberGroupIds = memberGroupRows.map(r => r.groupId);
      const userContactIds = userContactRows.map(r => r.id);

      const participantExpenseIds: string[] = [];
      if (userContactIds.length > 0) {
        const participantRows = await db
          .select({ expenseId: splitExpenseShares.expenseId })
          .from(splitExpenseShares)
          .where(inArray(splitExpenseShares.contactId, userContactIds));
        participantExpenseIds.push(...new Set(participantRows.map(r => r.expenseId)));
      }

      whereCondition = or(
        eq(splitExpenses.createdByUserId, auth.userId),
        memberGroupIds.length > 0 ? inArray(splitExpenses.groupId, memberGroupIds) : undefined,
        participantExpenseIds.length > 0 ? inArray(splitExpenses.id, participantExpenseIds) : undefined
      );
    } else {
      // Standalone: creator's own expenses + expenses where enrolled user is a participant
      const userContactRows = await db
        .select({ id: splitContacts.id })
        .from(splitContacts)
        .where(eq(splitContacts.linkedUserId, auth.userId));
      const userContactIds = userContactRows.map(r => r.id);

      if (userContactIds.length > 0) {
        const participantRows = await db
          .select({ expenseId: splitExpenseShares.expenseId })
          .from(splitExpenseShares)
          .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
          .where(and(
            inArray(splitExpenseShares.contactId, userContactIds),
            isNull(splitExpenses.groupId)
          ));
        const participantExpenseIds = [...new Set(participantRows.map(r => r.expenseId))];

        whereCondition = and(
          isNull(splitExpenses.groupId),
          or(
            eq(splitExpenses.createdByUserId, auth.userId),
            participantExpenseIds.length > 0
              ? inArray(splitExpenses.id, participantExpenseIds)
              : undefined
          )
        );
      } else {
        whereCondition = and(
          isNull(splitExpenses.groupId),
          eq(splitExpenses.createdByUserId, auth.userId)
        );
      }
    }

    const expenses = await db
      .select()
      .from(splitExpenses)
      .where(whereCondition)
      .orderBy(desc(splitExpenses.date));

    if (expenses.length === 0) return c.json({ data: [] });

    // Batch-fetch ALL shares for all expenses in a single query (eliminates N+1)
    const expenseIds = expenses.map(e => e.id);
    const allShares = await db
      .select({
        expenseId: splitExpenseShares.expenseId,
        id: splitExpenseShares.id,
        contactId: splitExpenseShares.contactId,
        isUser: splitExpenseShares.isUser,
        shareAmount: splitExpenseShares.shareAmount,
        splitValue: splitExpenseShares.splitValue,
        transactionId: splitExpenseShares.transactionId,
        receivableTransactionId: splitExpenseShares.receivableTransactionId,
        contactName: splitContacts.name,
        contactLinkedUserId: splitContacts.linkedUserId,
        txDate: transactions.date,
        txCategoryId: transactions.categoryId,
        txNotes: transactions.notes
      })
      .from(splitExpenseShares)
      .leftJoin(splitContacts, eq(splitExpenseShares.contactId, splitContacts.id))
      .leftJoin(transactions, eq(splitExpenseShares.transactionId, transactions.id))
      .where(inArray(splitExpenseShares.expenseId, expenseIds));

    // Group shares by expenseId in memory
    const sharesByExpense = new Map<string, typeof allShares>();
    for (const share of allShares) {
      const list = sharesByExpense.get(share.expenseId) ?? [];
      list.push(share);
      sharesByExpense.set(share.expenseId, list);
    }

    // Single batch for all creator names + all enrolled share names
    const foreignCreatorIds = [
      ...new Set(expenses.filter(e => e.createdByUserId !== auth.userId).map(e => e.createdByUserId))
    ];
    const allEnrolledUserIds = [
      ...new Set(allShares.filter(s => s.contactLinkedUserId).map(s => s.contactLinkedUserId!))
    ];
    const [creatorNameMap, enrolledNameMap] = await Promise.all([
      batchResolveUserNames(foreignCreatorIds),
      batchResolveUserNames(allEnrolledUserIds)
    ]);

    const expensesWithShares = expenses.map(expense => {
      const shares = sharesByExpense.get(expense.id) ?? [];
      const paidByMe = expense.paidByUser && expense.createdByUserId === auth.userId;
      const creatorName = expense.createdByUserId !== auth.userId
        ? (creatorNameMap.get(expense.createdByUserId) ?? null)
        : null;

      const sharesWithMine = shares.map(share => {
        let resolvedName = share.contactName;

        if (share.isUser && !share.contactId && creatorName) {
          // Creator's own share viewed by another participant — use creator's real name
          resolvedName = creatorName;
        } else if (share.contactLinkedUserId) {
          resolvedName = enrolledNameMap.get(share.contactLinkedUserId) ?? share.contactName ?? 'Unknown';
        }

        return {
          ...share,
          contactName: resolvedName,
          isMine:
            (share.isUser && expense.createdByUserId === auth.userId) ||
            share.contactLinkedUserId === auth.userId
        };
      });

      return { ...expense, paidByMe, shares: sharesWithMine };
    });

    return c.json({ data: expensesWithShares });
  })

  // POST / — create expense
  .post('/', zValidator('json', createExpenseSchema), async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const values = c.req.valid('json');
    const { groupId, description, totalAmount, date, paidByContactId, paidByUser, categoryId, splitType, notes, shares } = values;
    const currency = values.currency ?? 'NPR';

    // Access check for group
    if (groupId) {
      const [group] = await db.select().from(splitGroups).where(eq(splitGroups.id, groupId)).limit(1);
      if (!group) return c.json({ error: 'Group not found' }, 404);

      const isCreator = group.createdByUserId === auth.userId;
      const [membership] = await db
        .select()
        .from(splitGroupMembers)
        .where(and(eq(splitGroupMembers.groupId, groupId), eq(splitGroupMembers.userId, auth.userId)))
        .limit(1);
      if (!isCreator && !membership) return c.json({ error: 'Access denied' }, 403);
    }

    // Calculate share amounts
    const calculated = calculateShares(totalAmount, splitType, shares);

    // Validate sum ≈ totalAmount (allow ±1 for rounding)
    const sharesSum = calculated.reduce((sum, s) => sum + s.shareAmount, 0);
    if (Math.abs(sharesSum - totalAmount) > calculated.length) {
      return c.json({ error: 'Share amounts do not add up to total amount' }, 400);
    }

    // Insert expense + shares sequentially
    const [expense] = await db
      .insert(splitExpenses)
      .values({
        id: createId(),
        createdByUserId: auth.userId,
        groupId: groupId ?? null,
        description,
        totalAmount,
        currency,
        date,
        paidByContactId: paidByContactId ?? null,
        paidByUser,
        categoryId: categoryId ?? null,
        splitType,
        notes: notes ?? null
      })
      .returning();

    const insertedShares = await db
      .insert(splitExpenseShares)
      .values(
        calculated.map(s => ({
          id: createId(),
          expenseId: expense.id,
          contactId: s.contactId ?? null,
          isUser: s.isUser,
          shareAmount: s.shareAmount,
          splitValue: s.splitValue
        }))
      )
      .returning();

    // Find user's share
    const userShare = insertedShares.find(s => s.isUser);

    // Notify participants — batch-resolve contact linkedUserIds in one query
    const participantContactIds = insertedShares
      .filter(s => !s.isUser && s.contactId)
      .map(s => s.contactId!);

    let participantUserIds: string[] = [];
    if (participantContactIds.length > 0) {
      const contactRows = await db
        .select({ linkedUserId: splitContacts.linkedUserId })
        .from(splitContacts)
        .where(inArray(splitContacts.id, participantContactIds));
      participantUserIds = contactRows
        .map(r => r.linkedUserId)
        .filter((id): id is string => !!id);
    }

    await notifyExpenseCreated({ id: expense.id, description }, participantUserIds);

    return c.json({ data: { ...expense, shares: insertedShares, userShareId: userShare?.id } });
  })

  // POST /:id/shares/:shareId/record — record user's share as a transaction
  .post(
    '/:id/shares/:shareId/record',
    zValidator('json', recordShareSchema),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { id: expenseId, shareId } = c.req.param();
      const { categoryId, actualAccountId } = c.req.valid('json');

      const [share] = await db
        .select()
        .from(splitExpenseShares)
        .where(eq(splitExpenseShares.id, shareId))
        .limit(1);

      if (!share || share.expenseId !== expenseId) return c.json({ error: 'Share not found' }, 404);
      if (share.transactionId) return c.json({ error: 'Share already recorded' }, 400);

      const [expense] = await db.select().from(splitExpenses).where(eq(splitExpenses.id, expenseId)).limit(1);
      if (!expense) return c.json({ error: 'Expense not found' }, 404);

      // Verify this share belongs to the current user
      // isUser = true means it's the creator's share
      // For other participants: their contact's linkedUserId must match auth.userId
      let isAuthorized = false;
      if (share.isUser && expense.createdByUserId === auth.userId) {
        isAuthorized = true;
      } else if (share.contactId) {
        const [contact] = await db
          .select({ linkedUserId: splitContacts.linkedUserId })
          .from(splitContacts)
          .where(eq(splitContacts.id, share.contactId))
          .limit(1);
        if (contact?.linkedUserId === auth.userId) isAuthorized = true;
      }

      if (!isAuthorized) return c.json({ error: 'Access denied' }, 403);

      // Get virtual account for this context
      let virtualAccountId = await getUserVirtualAccountForContext(
        auth.userId,
        expense.groupId,
        expense.paidByContactId
      );

      // If standalone and user paid, find the first contact's virtual account
      if (!virtualAccountId && !expense.groupId && expense.paidByUser) {
        const otherShare = await db
          .select({ contactId: splitExpenseShares.contactId })
          .from(splitExpenseShares)
          .where(and(eq(splitExpenseShares.expenseId, expenseId), eq(splitExpenseShares.isUser, false)))
          .limit(1);

        if (otherShare[0]?.contactId) {
          const [contact] = await db
            .select({ virtualAccountId: splitContacts.virtualAccountId })
            .from(splitContacts)
            .where(eq(splitContacts.id, otherShare[0].contactId))
            .limit(1);
          virtualAccountId = contact?.virtualAccountId ?? null;
        }
      }

      if (!virtualAccountId) {
        return c.json({ error: 'No virtual account found for this split context' }, 400);
      }

      // Fetch all participant names for the receivable note
      const allSharesForNotes = await db
        .select({ isUser: splitExpenseShares.isUser, contactName: splitContacts.name })
        .from(splitExpenseShares)
        .leftJoin(splitContacts, eq(splitExpenseShares.contactId, splitContacts.id))
        .where(eq(splitExpenseShares.expenseId, expenseId));
      const participantNames = allSharesForNotes.map(s => s.isUser ? 'You' : (s.contactName ?? 'Unknown'));
      const notePrefix = expense.notes ? `${expense.notes} - ` : '';
      const receivableNotes = `BILL SPLIT: ${notePrefix}${expense.description} with ${participantNames.join(', ')}`;
      // My share tx: use the expense note as-is (or null)
      const myShareNotes = expense.notes ?? null;

      const txDate = expense.date;
      const expensePayee = expense.description;

      // Insert transactions then update the share row.
      // The UPDATE uses WHERE transactionId IS NULL as a race-condition guard.
      // If another concurrent request already recorded this share, we clean up the
      // inserted transactions manually (orphan cleanup) and return 400.
      let result: { transactionId: string; receivableTransactionId: string | null };
      let transactionId: string;
      let receivableTransactionId: string | null = null;

      if (expense.paidByUser && actualAccountId) {
        // User paid the full bill — create two transactions:
        // 1. USER_CREATED on the real account: user's own expense share
        const [expenseTx] = await db
          .insert(transactions)
          .values({
            id: createId(),
            amount: -share.shareAmount,
            payee: expensePayee,
            notes: myShareNotes,
            date: txDate,
            accountId: actualAccountId,
            categoryId: categoryId ?? null,
            type: 'USER_CREATED',
            isBillSplit: true
          })
          .returning();
        transactionId = expenseTx.id;

        // 2. PEER_TRANSFER on the virtual account: receivable from others
        const othersAmount = expense.totalAmount - share.shareAmount;
        if (othersAmount > 0) {
          const [receivableTx] = await db
            .insert(transactions)
            .values({
              id: createId(),
              amount: othersAmount,
              payee: 'Bill split transfer',
              notes: receivableNotes,
              date: txDate,
              accountId: virtualAccountId,
              categoryId: null,
              type: 'PEER_TRANSFER',
              isBillSplit: true
            })
            .returning();
          receivableTransactionId = receivableTx.id;
        }
      } else {
        // Someone else paid — user records their own share on the virtual account
        const [expenseTx] = await db
          .insert(transactions)
          .values({
            id: createId(),
            amount: -share.shareAmount,
            payee: expensePayee,
            notes: myShareNotes,
            date: txDate,
            accountId: virtualAccountId,
            categoryId: categoryId ?? null,
            type: 'USER_CREATED',
            isBillSplit: true
          })
          .returning();
        transactionId = expenseTx.id;
      }

      // Atomic link: only succeeds if another concurrent request hasn't already
      // recorded this share (WHERE transactionId IS NULL is the race-condition guard)
      const updated = await db
        .update(splitExpenseShares)
        .set({ transactionId, receivableTransactionId })
        .where(and(eq(splitExpenseShares.id, shareId), isNull(splitExpenseShares.transactionId)))
        .returning();

      if (updated.length === 0) {
        // Another concurrent request won — clean up the orphaned transactions we just inserted
        const orphanIds = [transactionId, receivableTransactionId].filter((id): id is string => !!id);
        if (orphanIds.length > 0) {
          await db.delete(transactions).where(inArray(transactions.id, orphanIds));
        }
        return c.json({ error: 'Share already recorded' }, 400);
      }

      result = { transactionId, receivableTransactionId };

      return c.json({ data: result });
    }
  )

  // DELETE /:id/shares/:shareId/record — unrecord a share
  .delete('/:id/shares/:shareId/record', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const { id: expenseId, shareId } = c.req.param();

    const [expense] = await db.select().from(splitExpenses).where(eq(splitExpenses.id, expenseId)).limit(1);
    if (!expense) return c.json({ error: 'Expense not found' }, 404);

    const [share] = await db.select().from(splitExpenseShares).where(eq(splitExpenseShares.id, shareId)).limit(1);
    if (!share || share.expenseId !== expenseId) return c.json({ error: 'Share not found' }, 404);
    if (!share.transactionId) return c.json({ error: 'Share not recorded' }, 400);

    let isAuthorized = false;
    if (share.isUser && expense.createdByUserId === auth.userId) {
      isAuthorized = true;
    } else if (share.contactId) {
      const [contact] = await db
        .select({ linkedUserId: splitContacts.linkedUserId })
        .from(splitContacts)
        .where(eq(splitContacts.id, share.contactId))
        .limit(1);
      if (contact?.linkedUserId === auth.userId) isAuthorized = true;
    }
    if (!isAuthorized) return c.json({ error: 'Access denied' }, 403);

    const txIds = [share.transactionId, share.receivableTransactionId].filter((id): id is string => !!id);
    await db.delete(transactions).where(inArray(transactions.id, txIds));
    await db.update(splitExpenseShares).set({ transactionId: null, receivableTransactionId: null }).where(eq(splitExpenseShares.id, shareId));

    return c.json({ data: { id: shareId } });
  })

  // PATCH /:id/shares/:shareId/record — edit a recorded share
  .patch(
    '/:id/shares/:shareId/record',
    zValidator('json', recordShareSchema),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { id: expenseId, shareId } = c.req.param();
      const { categoryId, date, notes } = c.req.valid('json');

      const [expense] = await db.select().from(splitExpenses).where(eq(splitExpenses.id, expenseId)).limit(1);
      if (!expense) return c.json({ error: 'Expense not found' }, 404);

      const [share] = await db.select().from(splitExpenseShares).where(eq(splitExpenseShares.id, shareId)).limit(1);
      if (!share || share.expenseId !== expenseId) return c.json({ error: 'Share not found' }, 404);
      if (!share.transactionId) return c.json({ error: 'Share not recorded' }, 400);

      let isAuthorized = false;
      if (share.isUser && expense.createdByUserId === auth.userId) {
        isAuthorized = true;
      } else if (share.contactId) {
        const [contact] = await db
          .select({ linkedUserId: splitContacts.linkedUserId })
          .from(splitContacts)
          .where(eq(splitContacts.id, share.contactId))
          .limit(1);
        if (contact?.linkedUserId === auth.userId) isAuthorized = true;
      }
      if (!isAuthorized) return c.json({ error: 'Access denied' }, 403);

      await db.update(transactions).set({ date, categoryId: categoryId ?? null, notes: notes ?? null }).where(eq(transactions.id, share.transactionId));

      if (share.receivableTransactionId) {
        await db.update(transactions).set({ date, notes: notes ?? null }).where(eq(transactions.id, share.receivableTransactionId));
      }

      return c.json({ data: { id: shareId } });
    }
  )

  // PATCH /:id — edit expense (creator only)
  // Safe fields (always): description, date, notes, categoryId
  // Structural fields (only if no shares recorded): totalAmount, paidByUser, paidByContactId, splitType, shares
  .patch(
    '/:id',
    zValidator(
      'json',
      z.object({
        description: z.string().min(1).optional(),
        date: z.coerce.date().optional(),
        notes: z.string().nullable().optional(),
        categoryId: z.string().nullable().optional(),
        totalAmount: z.number().int().positive().optional(),
        paidByUser: z.boolean().optional(),
        paidByContactId: z.string().nullable().optional(),
        splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']).optional(),
        shares: z.array(shareSchema).min(2).optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { id } = c.req.param();
      const body = c.req.valid('json');

      const [expense] = await db.select().from(splitExpenses).where(eq(splitExpenses.id, id)).limit(1);
      if (!expense) return c.json({ error: 'Expense not found' }, 404);
      if (expense.createdByUserId !== auth.userId) return c.json({ error: 'Only the creator can edit an expense' }, 403);

      // Check if any shares are recorded (have a transactionId)
      const existingShares = await db
        .select({ id: splitExpenseShares.id, transactionId: splitExpenseShares.transactionId })
        .from(splitExpenseShares)
        .where(eq(splitExpenseShares.expenseId, id));

      const hasRecordedShares = existingShares.some(s => s.transactionId);

      // Always update safe metadata fields
      const metaUpdate: Record<string, unknown> = {};
      if (body.description !== undefined) metaUpdate.description = body.description;
      if (body.date !== undefined) metaUpdate.date = body.date;
      if (body.notes !== undefined) metaUpdate.notes = body.notes;
      if (body.categoryId !== undefined) metaUpdate.categoryId = body.categoryId;

      // Structural changes only when no shares are recorded
      if (!hasRecordedShares && body.shares && body.totalAmount !== undefined) {
        metaUpdate.totalAmount = body.totalAmount;
        metaUpdate.paidByUser = body.paidByUser ?? false;
        metaUpdate.paidByContactId = body.paidByContactId ?? null;
        metaUpdate.splitType = body.splitType ?? 'EQUAL';

        const calculatedShares = calculateShares(body.totalAmount, body.splitType ?? 'EQUAL', body.shares);

        // Delete old shares and insert new ones sequentially
        await db.delete(splitExpenseShares).where(eq(splitExpenseShares.expenseId, id));
        await db.insert(splitExpenseShares).values(
          calculatedShares.map(s => ({
            id: createId(),
            expenseId: id,
            contactId: s.contactId ?? null,
            isUser: s.isUser,
            shareAmount: s.shareAmount,
            splitValue: s.splitValue
          }))
        );
        if (Object.keys(metaUpdate).length > 0) {
          await db.update(splitExpenses).set(metaUpdate).where(eq(splitExpenses.id, id));
        }

        return c.json({ data: { id } });
      }

      if (Object.keys(metaUpdate).length > 0) {
        await db.update(splitExpenses).set(metaUpdate).where(eq(splitExpenses.id, id));
      }

      return c.json({ data: { id } });
    }
  )

  // DELETE /:id — delete expense (creator only)
  .delete('/:id', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const { id } = c.req.param();

    const [expense] = await db.select().from(splitExpenses).where(eq(splitExpenses.id, id)).limit(1);
    if (!expense) return c.json({ error: 'Expense not found' }, 404);
    if (expense.createdByUserId !== auth.userId) return c.json({ error: 'Only the creator can delete an expense' }, 403);

    // Delete linked transactions in a single batch query
    const shares = await db
      .select({
        transactionId: splitExpenseShares.transactionId,
        receivableTransactionId: splitExpenseShares.receivableTransactionId
      })
      .from(splitExpenseShares)
      .where(eq(splitExpenseShares.expenseId, id));

    const transactionIds = shares
      .flatMap(s => [s.transactionId, s.receivableTransactionId])
      .filter((txId): txId is string => !!txId);

    // Delete linked transactions then the expense (cascade removes shares)
    if (transactionIds.length > 0) {
      await db.delete(transactions).where(inArray(transactions.id, transactionIds));
    }
    await db.delete(splitExpenses).where(eq(splitExpenses.id, id));

    return c.json({ data: { id } });
  });

export default app;
