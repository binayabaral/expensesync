import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { splitContacts, splitExpenseShares, splitExpenses, splitGroupMembers, splitGroups, splitSettlements, users } from '@/db/schema';
import { batchResolveContacts, batchResolveUserNames, ensureEnrolled } from '@/lib/split-db';

type BalanceEntry = {
  key: string;
  name: string;
  linkedUserId: string | null;
  contactId: string | null;
  virtualAccountId: string | null;
  email: string | null;
  netAmount: number; // positive = they owe user; negative = user owes them
};

const app = new Hono().get('/', async c => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

  const balanceMap = new Map<string, BalanceEntry>();

  function upsert(
    key: string,
    name: string,
    linkedUserId: string | null,
    contactId: string | null,
    virtualAccountId: string | null,
    email: string | null,
    delta: number
  ) {
    const existing = balanceMap.get(key);
    if (existing) {
      existing.netAmount += delta;
      if (!existing.contactId && contactId) {
        existing.contactId = contactId;
        existing.virtualAccountId = virtualAccountId;
        existing.email = email;
      }
    } else {
      balanceMap.set(key, { key, name, linkedUserId, contactId, virtualAccountId, email, netAmount: delta });
    }
  }

  // ── ROUND 1: All fully independent queries (8 in parallel) ───────────────
  const [
    userContactRecords,
    creditorShares,
    creatorDebtShares,
    settlementsToContact,
    settlementsFromContact,
    creatorGroupRows,
    allContacts,
    reverseContacts
  ] = await Promise.all([
    db.select({ id: splitContacts.id })
      .from(splitContacts)
      .where(eq(splitContacts.linkedUserId, auth.userId)),

    // Part 1: standalone — user paid, contacts owe user
    db.select({
      shareAmount: splitExpenseShares.shareAmount,
      contactId: splitExpenseShares.contactId,
      contactName: splitContacts.name,
      linkedUserId: splitContacts.linkedUserId,
      virtualAccountId: splitContacts.virtualAccountId,
      email: splitContacts.email
    })
    .from(splitExpenseShares)
    .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
    .innerJoin(splitContacts, eq(splitExpenseShares.contactId, splitContacts.id))
    .where(and(
      eq(splitExpenses.createdByUserId, auth.userId),
      eq(splitExpenses.paidByUser, true),
      eq(splitExpenseShares.isUser, false),
      isNull(splitExpenses.groupId)
    )),

    // Part 2: standalone — contact paid, user owes contact
    db.select({
      shareAmount: splitExpenseShares.shareAmount,
      paidByContactId: splitExpenses.paidByContactId
    })
    .from(splitExpenseShares)
    .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
    .where(and(
      eq(splitExpenses.createdByUserId, auth.userId),
      eq(splitExpenseShares.isUser, true),
      isNotNull(splitExpenses.paidByContactId),
      isNull(splitExpenses.groupId)
    )),

    // Part 4: standalone settlement — user paid contact
    db.select({ amount: splitSettlements.amount, toContactId: splitSettlements.toContactId })
    .from(splitSettlements)
    .where(and(
      eq(splitSettlements.createdByUserId, auth.userId),
      eq(splitSettlements.fromIsUser, true),
      isNotNull(splitSettlements.toContactId),
      isNull(splitSettlements.groupId)
    )),

    // Part 4: standalone settlement — contact paid user
    db.select({ amount: splitSettlements.amount, fromContactId: splitSettlements.fromContactId })
    .from(splitSettlements)
    .where(and(
      eq(splitSettlements.createdByUserId, auth.userId),
      isNotNull(splitSettlements.fromContactId),
      eq(splitSettlements.toIsUser, true),
      isNull(splitSettlements.groupId)
    )),

    // Part 5: groups created by user
    db.select({ id: splitGroups.id })
    .from(splitGroups)
    .where(eq(splitGroups.createdByUserId, auth.userId)),

    // Zero-balance contacts for People section
    db.select({
      id: splitContacts.id,
      name: splitContacts.name,
      linkedUserId: splitContacts.linkedUserId,
      virtualAccountId: splitContacts.virtualAccountId,
      email: splitContacts.email
    })
    .from(splitContacts)
    .where(eq(splitContacts.createdByUserId, auth.userId)),

    // Bidirectional visibility
    db.select({ createdByUserId: splitContacts.createdByUserId })
    .from(splitContacts)
    .where(eq(splitContacts.linkedUserId, auth.userId))
  ]);

  const userContactIds = userContactRecords.map(c => c.id);
  const allReverseUserIds = reverseContacts
    .map(r => r.createdByUserId)
    .filter(uid => uid !== auth.userId);
  const standaloneContactIds = [...new Set([
    ...creatorDebtShares.map(s => s.paidByContactId!).filter(Boolean),
    ...settlementsToContact.map(s => s.toContactId!).filter(Boolean),
    ...settlementsFromContact.map(s => s.fromContactId!).filter(Boolean)
  ])];

  // ── ROUND 2: Queries needing Round 1 results (6 in parallel) ─────────────
  const [
    participantShares,
    memberGroupRows,
    othersPayingMe,
    mePaying,
    standaloneContactMap
  ] = await Promise.all([
    // Part 3: standalone — user is participant in another user's expense
    userContactIds.length > 0
      ? db.select({
          shareAmount: splitExpenseShares.shareAmount,
          expenseId: splitExpenseShares.expenseId,
          paidByUser: splitExpenses.paidByUser,
          createdByUserId: splitExpenses.createdByUserId,
          paidByContactId: splitExpenses.paidByContactId
        })
        .from(splitExpenseShares)
        .innerJoin(splitContacts, eq(splitExpenseShares.contactId, splitContacts.id))
        .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
        .where(and(eq(splitContacts.linkedUserId, auth.userId), isNull(splitExpenses.groupId)))
      : Promise.resolve([] as { shareAmount: number; expenseId: string; paidByUser: boolean; createdByUserId: string; paidByContactId: string | null }[]),

    // Part 5: groups where user is a member
    userContactIds.length > 0
      ? db.select({ groupId: splitGroupMembers.groupId })
          .from(splitGroupMembers)
          .where(inArray(splitGroupMembers.contactId, userContactIds))
      : Promise.resolve([] as { groupId: string }[]),

    // Part 4 cross-user: others paid user (standalone)
    userContactIds.length > 0
      ? db.select({ amount: splitSettlements.amount, createdByUserId: splitSettlements.createdByUserId })
          .from(splitSettlements)
          .where(and(
            eq(splitSettlements.fromIsUser, true),
            inArray(splitSettlements.toContactId, userContactIds),
            isNull(splitSettlements.groupId)
          ))
      : Promise.resolve([] as { amount: number; createdByUserId: string }[]),

    // Part 4 cross-user: user paid others (standalone)
    userContactIds.length > 0
      ? db.select({ amount: splitSettlements.amount, createdByUserId: splitSettlements.createdByUserId })
          .from(splitSettlements)
          .where(and(
            eq(splitSettlements.toIsUser, true),
            inArray(splitSettlements.fromContactId, userContactIds),
            isNull(splitSettlements.groupId)
          ))
      : Promise.resolve([] as { amount: number; createdByUserId: string }[]),

    // Parts 2+4: resolve all standalone contact IDs in one batch
    standaloneContactIds.length > 0
      ? batchResolveContacts(standaloneContactIds)
      : Promise.resolve(new Map<string, { name: string; linkedUserId: string | null; virtualAccountId: string | null; email: string | null }>())
  ]);

  // ── Process Part 1 (all data available from Round 1) ─────────────────────
  for (const s of creditorShares) {
    const key = s.linkedUserId ? `u:${s.linkedUserId}` : `c:${s.contactId}`;
    upsert(key, s.contactName, s.linkedUserId, s.contactId, s.virtualAccountId, s.email, s.shareAmount);
  }

  // ── Process Part 2 (standaloneContactMap from Round 2) ───────────────────
  for (const s of creatorDebtShares) {
    if (!s.paidByContactId) continue;
    const payer = standaloneContactMap.get(s.paidByContactId);
    if (!payer) continue;
    const key = payer.linkedUserId ? `u:${payer.linkedUserId}` : `c:${s.paidByContactId}`;
    upsert(key, payer.name, payer.linkedUserId, s.paidByContactId, payer.virtualAccountId, payer.email, -s.shareAmount);
  }

  // ── Process Part 4a + 4b (standaloneContactMap from Round 2) ─────────────
  for (const s of settlementsToContact) {
    if (!s.toContactId) continue;
    const r = standaloneContactMap.get(s.toContactId);
    if (!r) continue;
    const key = r.linkedUserId ? `u:${r.linkedUserId}` : `c:${s.toContactId}`;
    upsert(key, r.name, r.linkedUserId, s.toContactId, r.virtualAccountId, r.email, s.amount);
  }
  for (const s of settlementsFromContact) {
    if (!s.fromContactId) continue;
    const r = standaloneContactMap.get(s.fromContactId);
    if (!r) continue;
    const key = r.linkedUserId ? `u:${r.linkedUserId}` : `c:${s.fromContactId}`;
    upsert(key, r.name, r.linkedUserId, s.fromContactId, r.virtualAccountId, r.email, -s.amount);
  }

  // ── Derive IDs for Round 3 ────────────────────────────────────────────────
  const relevantShares = participantShares.filter(s => s.createdByUserId !== auth.userId);
  const creatorUserIds = [...new Set(relevantShares.map(s => s.createdByUserId))];
  const part3PayerContactIds = [...new Set(relevantShares.filter(s => s.paidByContactId).map(s => s.paidByContactId!))];
  const crossUserIds = [...new Set([
    ...othersPayingMe.filter(s => s.createdByUserId !== auth.userId).map(s => s.createdByUserId),
    ...mePaying.filter(s => s.createdByUserId !== auth.userId).map(s => s.createdByUserId)
  ])];
  const groupIds = [...new Set([
    ...creatorGroupRows.map(r => r.id),
    ...memberGroupRows.map(r => r.groupId)
  ])];
  // All user IDs needing name/email resolution — resolved in one batch
  const allUserIdsToResolve = [...new Set([...creatorUserIds, ...crossUserIds, ...allReverseUserIds])];

  // ── ROUND 3: All queries needing Round 2 results (7 in parallel) ──────────
  const [
    part3PayerContactMap,
    allUserNameMap,
    allUserEmailRows,
    allLocalContacts,
    allMemberRows,
    allExpenseRows,
    allSettlementRows
  ] = await Promise.all([
    part3PayerContactIds.length > 0
      ? batchResolveContacts(part3PayerContactIds)
      : Promise.resolve(new Map<string, { name: string; linkedUserId: string | null; virtualAccountId: string | null; email: string | null }>()),

    // Merged name lookup: Part 3 creators + Part 4 cross-user + bidirectional
    allUserIdsToResolve.length > 0
      ? batchResolveUserNames(allUserIdsToResolve)
      : Promise.resolve(new Map<string, string>()),

    // Merged email lookup
    allUserIdsToResolve.length > 0
      ? db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, allUserIdsToResolve))
      : Promise.resolve([] as { id: string; email: string | null }[]),

    // Merged local contact lookup for Part 3 creators + Part 4 cross-user + reverse users
    allUserIdsToResolve.length > 0
      ? db.select({ linkedUserId: splitContacts.linkedUserId, id: splitContacts.id, virtualAccountId: splitContacts.virtualAccountId })
          .from(splitContacts)
          .where(and(eq(splitContacts.createdByUserId, auth.userId), inArray(splitContacts.linkedUserId, allUserIdsToResolve)))
      : Promise.resolve([] as { linkedUserId: string | null; id: string; virtualAccountId: string | null }[]),

    // Part 5: group members
    groupIds.length > 0
      ? db.select({
          groupId: splitGroupMembers.groupId,
          contactId: splitGroupMembers.contactId,
          linkedUserId: splitContacts.linkedUserId
        })
        .from(splitGroupMembers)
        .innerJoin(splitContacts, eq(splitGroupMembers.contactId, splitContacts.id))
        .where(inArray(splitGroupMembers.groupId, groupIds))
      : Promise.resolve([] as { groupId: string; contactId: string; linkedUserId: string | null }[]),

    // Part 5: group expenses + shares
    groupIds.length > 0
      ? db.select({
          groupId: splitExpenses.groupId,
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
        .where(inArray(splitExpenses.groupId, groupIds))
      : Promise.resolve([] as { groupId: string | null; expenseId: string; createdByUserId: string; paidByUser: boolean; paidByContactId: string | null; shareIsUser: boolean; shareContactId: string | null; shareAmount: number }[]),

    // Part 5: group settlements
    groupIds.length > 0
      ? db.select({
          groupId: splitSettlements.groupId,
          createdByUserId: splitSettlements.createdByUserId,
          fromIsUser: splitSettlements.fromIsUser,
          toIsUser: splitSettlements.toIsUser,
          fromContactId: splitSettlements.fromContactId,
          toContactId: splitSettlements.toContactId,
          amount: splitSettlements.amount
        })
        .from(splitSettlements)
        .where(inArray(splitSettlements.groupId, groupIds))
      : Promise.resolve([] as { groupId: string | null; createdByUserId: string; fromIsUser: boolean; toIsUser: boolean; fromContactId: string | null; toContactId: string | null; amount: number }[])
  ]);

  // ── Derive for Round 4 ────────────────────────────────────────────────────
  const expenseIdsWhereIPaid = relevantShares
    .filter(s => s.paidByContactId && part3PayerContactMap.get(s.paidByContactId)?.linkedUserId === auth.userId)
    .map(s => s.expenseId);

  const allGroupContactIdSet = new Set<string>();
  for (const r of allMemberRows) allGroupContactIdSet.add(r.contactId);
  for (const r of allExpenseRows) {
    if (r.paidByContactId) allGroupContactIdSet.add(r.paidByContactId);
    if (r.shareContactId) allGroupContactIdSet.add(r.shareContactId);
  }
  for (const r of allSettlementRows) {
    if (r.fromContactId) allGroupContactIdSet.add(r.fromContactId);
    if (r.toContactId) allGroupContactIdSet.add(r.toContactId);
  }

  // ── ROUND 4: Final dependent queries (2 in parallel) ─────────────────────
  const [creatorShareRows, groupContactMap] = await Promise.all([
    expenseIdsWhereIPaid.length > 0
      ? db.select({ expenseId: splitExpenseShares.expenseId, shareAmount: splitExpenseShares.shareAmount })
          .from(splitExpenseShares)
          .where(and(inArray(splitExpenseShares.expenseId, expenseIdsWhereIPaid), eq(splitExpenseShares.isUser, true)))
      : Promise.resolve([] as { expenseId: string; shareAmount: number }[]),

    allGroupContactIdSet.size > 0
      ? batchResolveContacts([...allGroupContactIdSet])
      : Promise.resolve(new Map<string, { name: string; linkedUserId: string | null; virtualAccountId: string | null; email: string | null }>())
  ]);

  // ── Process Part 3 ────────────────────────────────────────────────────────
  const allUserEmailMap = new Map(allUserEmailRows.map(r => [r.id, r.email]));
  const localContactByLinkedUser = new Map(allLocalContacts.map(r => [r.linkedUserId!, r]));
  const creatorShareByExpense = new Map(creatorShareRows.map(cs => [cs.expenseId, cs.shareAmount]));

  for (const s of relevantShares) {
    const key = `u:${s.createdByUserId}`;
    const creatorName = allUserNameMap.get(s.createdByUserId) ?? 'Unknown';
    const creatorEmail = allUserEmailMap.get(s.createdByUserId) ?? null;
    const localContact = localContactByLinkedUser.get(s.createdByUserId) ?? null;

    if (s.paidByUser) {
      upsert(key, creatorName, s.createdByUserId, localContact?.id ?? null, localContact?.virtualAccountId ?? null, creatorEmail, -s.shareAmount);
    } else if (s.paidByContactId) {
      const payerContact = part3PayerContactMap.get(s.paidByContactId);
      if (payerContact?.linkedUserId === auth.userId) {
        const creatorShare = creatorShareByExpense.get(s.expenseId);
        if (creatorShare != null) {
          upsert(key, creatorName, s.createdByUserId, localContact?.id ?? null, localContact?.virtualAccountId ?? null, creatorEmail, creatorShare);
        }
      }
    }
  }

  // ── Process Part 4 cross-user ─────────────────────────────────────────────
  for (const s of othersPayingMe) {
    if (s.createdByUserId === auth.userId) continue;
    const key = `u:${s.createdByUserId}`;
    const lc = localContactByLinkedUser.get(s.createdByUserId) ?? null;
    upsert(key, allUserNameMap.get(s.createdByUserId) ?? 'Unknown', s.createdByUserId, lc?.id ?? null, lc?.virtualAccountId ?? null, allUserEmailMap.get(s.createdByUserId) ?? null, -s.amount);
  }
  for (const s of mePaying) {
    if (s.createdByUserId === auth.userId) continue;
    const key = `u:${s.createdByUserId}`;
    const lc = localContactByLinkedUser.get(s.createdByUserId) ?? null;
    upsert(key, allUserNameMap.get(s.createdByUserId) ?? 'Unknown', s.createdByUserId, lc?.id ?? null, lc?.virtualAccountId ?? null, allUserEmailMap.get(s.createdByUserId) ?? null, s.amount);
  }

  // ── Process Part 5: per-group min-transactions (Splitwise-style) ──────────
  const resolveKey = (contactId: string): string =>
    groupContactMap.get(contactId)?.linkedUserId ?? contactId;

  const membersByGroup = new Map<string, typeof allMemberRows>();
  const expensesByGroup = new Map<string, typeof allExpenseRows>();
  const settlementsByGroup = new Map<string, typeof allSettlementRows>();
  for (const r of allMemberRows) {
    if (!membersByGroup.has(r.groupId)) membersByGroup.set(r.groupId, []);
    membersByGroup.get(r.groupId)!.push(r);
  }
  for (const r of allExpenseRows) {
    const gid = r.groupId!;
    if (!expensesByGroup.has(gid)) expensesByGroup.set(gid, []);
    expensesByGroup.get(gid)!.push(r);
  }
  for (const r of allSettlementRows) {
    const gid = r.groupId!;
    if (!settlementsByGroup.has(gid)) settlementsByGroup.set(gid, []);
    settlementsByGroup.get(gid)!.push(r);
  }

  for (const groupId of groupIds) {
    const members = membersByGroup.get(groupId) ?? [];
    const expenseRows = expensesByGroup.get(groupId) ?? [];
    const settlementRows = settlementsByGroup.get(groupId) ?? [];

    const globalNet = new Map<string, number>();
    globalNet.set(auth.userId, 0);
    for (const m of members) globalNet.set(m.linkedUserId ?? m.contactId, 0);

    const expenseGrouped = new Map<string, {
      createdByUserId: string;
      paidByUser: boolean;
      paidByContactId: string | null;
      shares: { isUser: boolean; contactId: string | null; shareAmount: number }[];
    }>();
    for (const row of expenseRows) {
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
        : expense.paidByContactId ? resolveKey(expense.paidByContactId) : expense.createdByUserId;
      for (const share of expense.shares) {
        const ownerKey = share.isUser
          ? expense.createdByUserId
          : share.contactId ? resolveKey(share.contactId) : null;
        if (!ownerKey || ownerKey === payerKey) continue;
        globalNet.set(payerKey, (globalNet.get(payerKey) ?? 0) + share.shareAmount);
        globalNet.set(ownerKey, (globalNet.get(ownerKey) ?? 0) - share.shareAmount);
      }
    }

    for (const s of settlementRows) {
      const fromKey = s.fromIsUser ? s.createdByUserId : s.fromContactId ? resolveKey(s.fromContactId) : null;
      const toKey = s.toIsUser ? s.createdByUserId : s.toContactId ? resolveKey(s.toContactId) : null;
      if (!fromKey || !toKey) continue;
      globalNet.set(fromKey, (globalNet.get(fromKey) ?? 0) + s.amount);
      globalNet.set(toKey, (globalNet.get(toKey) ?? 0) - s.amount);
    }

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

    const keyToContactId = new Map(members.map(m => [m.linkedUserId ?? m.contactId, m.contactId]));
    for (const debt of simplifiedDebts) {
      if (debt.from === auth.userId) {
        const contactId = keyToContactId.get(debt.to);
        if (!contactId) continue;
        const contact = groupContactMap.get(contactId);
        if (!contact) continue;
        const key = contact.linkedUserId ? `u:${contact.linkedUserId}` : `c:${contactId}`;
        upsert(key, contact.name, contact.linkedUserId, contactId, contact.virtualAccountId, contact.email, -debt.amount);
      } else if (debt.to === auth.userId) {
        const contactId = keyToContactId.get(debt.from);
        if (!contactId) continue;
        const contact = groupContactMap.get(contactId);
        if (!contact) continue;
        const key = contact.linkedUserId ? `u:${contact.linkedUserId}` : `c:${contactId}`;
        upsert(key, contact.name, contact.linkedUserId, contactId, contact.virtualAccountId, contact.email, debt.amount);
      }
    }
  }

  // ── Merge zero-balance contacts ───────────────────────────────────────────
  for (const contact of allContacts) {
    const key = contact.linkedUserId ? `u:${contact.linkedUserId}` : `c:${contact.id}`;
    if (!balanceMap.has(key)) {
      balanceMap.set(key, {
        key,
        name: contact.name,
        linkedUserId: contact.linkedUserId,
        contactId: contact.id,
        virtualAccountId: contact.virtualAccountId,
        email: contact.email,
        netAmount: 0
      });
    }
  }

  // ── Merge bidirectional reverse contacts ──────────────────────────────────
  for (const uid of allReverseUserIds) {
    const key = `u:${uid}`;
    if (balanceMap.has(key)) continue;
    const localContact = localContactByLinkedUser.get(uid) ?? null;
    balanceMap.set(key, {
      key,
      name: allUserNameMap.get(uid) ?? 'Unknown',
      linkedUserId: uid,
      contactId: localContact?.id ?? null,
      virtualAccountId: localContact?.virtualAccountId ?? null,
      email: allUserEmailMap.get(uid) ?? null,
      netAmount: 0
    });
  }

  // ── ROUND 5: Resolve real names for all enrolled users in balanceMap ──────
  const enrolledKeys = Array.from(balanceMap.values()).filter(e => e.linkedUserId).map(e => e.linkedUserId!);
  if (enrolledKeys.length > 0) {
    const nameMap = await batchResolveUserNames(enrolledKeys);
    for (const entry of balanceMap.values()) {
      if (entry.linkedUserId) {
        const resolved = nameMap.get(entry.linkedUserId);
        if (resolved) entry.name = resolved;
      }
    }
  }

  const balances = Array.from(balanceMap.values()).filter(b => b.linkedUserId !== auth.userId);
  return c.json({ data: balances });
});

export default app;
