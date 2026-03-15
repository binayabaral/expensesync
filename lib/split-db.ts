/**
 * Shared database utilities for bill-split API routes.
 * Centralises repeated helpers so each route file stays focused on business logic.
 */
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

import { db, type DbOrTx } from '@/db/drizzle';
import { accounts, splitContacts, splitExpenseShares, splitExpenses, splitGroupMembers, splitSettlements, users, SUPPORTED_CURRENCIES } from '@/db/schema';

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Returns the enrolled bill-split user record, or null if not enrolled. */
export async function ensureEnrolled(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

// ─── Batch Lookups ───────────────────────────────────────────────────────────

/**
 * Resolves display names for a set of enrolled userIds in a single query.
 * Returns a Map<userId, name>.
 */
export async function batchResolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));
  return new Map(rows.map(r => [r.id, r.name]));
}

/**
 * Resolves contact metadata for a set of contactIds in a single query.
 * Returns a Map<contactId, { linkedUserId, name, virtualAccountId, email }>.
 */
export async function batchResolveContacts(contactIds: string[]): Promise<Map<string, {
  linkedUserId: string | null;
  name: string;
  virtualAccountId: string | null;
  email: string | null;
}>> {
  if (contactIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: splitContacts.id,
      linkedUserId: splitContacts.linkedUserId,
      name: splitContacts.name,
      virtualAccountId: splitContacts.virtualAccountId,
      email: splitContacts.email
    })
    .from(splitContacts)
    .where(inArray(splitContacts.id, contactIds));
  return new Map(rows.map(r => [r.id, {
    linkedUserId: r.linkedUserId,
    name: r.name,
    virtualAccountId: r.virtualAccountId,
    email: r.email
  }]));
}

// ─── Group Pair Balance ───────────────────────────────────────────────────────

/**
 * Computes the net balance between userId and otherUserId within a specific group.
 * Positive = otherUser owes userId. Negative = userId owes otherUser.
 */
export async function computeGroupPairNet(userId: string, otherUserId: string, groupId: string): Promise<number> {
  // Parallelise the two independent contact lookups (was sequential)
  const [otherContacts, selfContacts] = await Promise.all([
    db.select({ id: splitContacts.id }).from(splitContacts).where(eq(splitContacts.linkedUserId, otherUserId)),
    db.select({ id: splitContacts.id }).from(splitContacts).where(eq(splitContacts.linkedUserId, userId))
  ]);
  const otherContactIds = otherContacts.map(c => c.id);
  const selfContactIds = selfContacts.map(c => c.id);

  let net = 0;

  if (otherContactIds.length > 0) {
    const [caseA] = await db.select({ total: sql<number>`coalesce(sum(${splitExpenseShares.shareAmount}), 0)` })
      .from(splitExpenseShares)
      .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
      .where(and(eq(splitExpenses.groupId, groupId), eq(splitExpenses.createdByUserId, userId), eq(splitExpenses.paidByUser, true), eq(splitExpenseShares.isUser, false), inArray(splitExpenseShares.contactId, otherContactIds)));
    net += Number(caseA?.total ?? 0);

    const [caseB] = await db.select({ total: sql<number>`coalesce(sum(${splitExpenseShares.shareAmount}), 0)` })
      .from(splitExpenseShares)
      .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
      .where(and(eq(splitExpenses.groupId, groupId), eq(splitExpenses.createdByUserId, userId), eq(splitExpenseShares.isUser, true), isNotNull(splitExpenses.paidByContactId), inArray(splitExpenses.paidByContactId, otherContactIds)));
    net -= Number(caseB?.total ?? 0);
  }

  if (selfContactIds.length > 0) {
    const [caseC] = await db.select({ total: sql<number>`coalesce(sum(${splitExpenseShares.shareAmount}), 0)` })
      .from(splitExpenseShares)
      .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
      .where(and(eq(splitExpenses.groupId, groupId), eq(splitExpenses.createdByUserId, otherUserId), eq(splitExpenses.paidByUser, true), eq(splitExpenseShares.isUser, false), inArray(splitExpenseShares.contactId, selfContactIds)));
    net -= Number(caseC?.total ?? 0);

    if (otherContactIds.length > 0) {
      const otherUserShares = await db.select({ shareAmount: splitExpenseShares.shareAmount, paidByContactId: splitExpenses.paidByContactId })
        .from(splitExpenseShares)
        .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
        .where(and(eq(splitExpenses.groupId, groupId), eq(splitExpenses.createdByUserId, otherUserId), eq(splitExpenseShares.isUser, false), inArray(splitExpenseShares.contactId, otherContactIds)));
      for (const r of otherUserShares) {
        if (r.paidByContactId && selfContactIds.includes(r.paidByContactId)) net += r.shareAmount;
      }
    }
  }

  if (otherContactIds.length > 0) {
    const [sPaid] = await db.select({ total: sql<number>`coalesce(sum(${splitSettlements.amount}), 0)` }).from(splitSettlements)
      .where(and(eq(splitSettlements.groupId, groupId), eq(splitSettlements.createdByUserId, userId), eq(splitSettlements.fromIsUser, true), inArray(splitSettlements.toContactId, otherContactIds)));
    net += Number(sPaid?.total ?? 0);

    const [sReceived] = await db.select({ total: sql<number>`coalesce(sum(${splitSettlements.amount}), 0)` }).from(splitSettlements)
      .where(and(eq(splitSettlements.groupId, groupId), eq(splitSettlements.createdByUserId, userId), eq(splitSettlements.toIsUser, true), inArray(splitSettlements.fromContactId, otherContactIds)));
    net -= Number(sReceived?.total ?? 0);
  }

  if (selfContactIds.length > 0) {
    const [crossPaid] = await db.select({ total: sql<number>`coalesce(sum(${splitSettlements.amount}), 0)` }).from(splitSettlements)
      .where(and(eq(splitSettlements.groupId, groupId), eq(splitSettlements.createdByUserId, otherUserId), eq(splitSettlements.fromIsUser, true), inArray(splitSettlements.toContactId, selfContactIds)));
    net -= Number(crossPaid?.total ?? 0);

    const [crossReceived] = await db.select({ total: sql<number>`coalesce(sum(${splitSettlements.amount}), 0)` }).from(splitSettlements)
      .where(and(eq(splitSettlements.groupId, groupId), eq(splitSettlements.createdByUserId, otherUserId), eq(splitSettlements.toIsUser, true), inArray(splitSettlements.fromContactId, selfContactIds)));
    net += Number(crossReceived?.total ?? 0);
  }

  return net;
}

/**
 * Returns true if userId and otherUserId share at least one group with a non-zero pair net balance.
 */
export async function hasOutstandingGroupBalance(userId: string, otherUserId: string): Promise<boolean> {
  const [userGroupRows, otherGroupRows] = await Promise.all([
    db.select({ groupId: splitGroupMembers.groupId }).from(splitGroupMembers).where(eq(splitGroupMembers.userId, userId)),
    db.select({ groupId: splitGroupMembers.groupId }).from(splitGroupMembers).where(eq(splitGroupMembers.userId, otherUserId))
  ]);
  const otherGroupSet = new Set(otherGroupRows.map(r => r.groupId));
  const sharedGroupIds = userGroupRows.map(r => r.groupId).filter(id => otherGroupSet.has(id));

  for (const groupId of sharedGroupIds) {
    const net = await computeGroupPairNet(userId, otherUserId, groupId);
    if (net !== 0) return true;
  }
  return false;
}

// ─── Virtual Accounts ────────────────────────────────────────────────────────

/** Creates a hidden BILL_SPLIT virtual account for the given user.
 *  Pass `dbOrTx` when calling from inside a `db.transaction()` callback. */
export async function createGroupVirtualAccount(
  userId: string,
  groupName: string,
  currency: typeof SUPPORTED_CURRENCIES[number],
  dbOrTx: DbOrTx = db
) {
  const [account] = await dbOrTx
    .insert(accounts)
    .values({
      id: createId(),
      name: groupName,
      userId,
      accountType: 'BILL_SPLIT',
      isHidden: true,
      currency
    })
    .returning();
  return account;
}
