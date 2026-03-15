import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { splitContacts, splitExpenseShares, splitExpenses, splitSettlements, users } from '@/db/schema';
import { batchResolveContacts, batchResolveUserNames, ensureEnrolled, hasOutstandingGroupBalance } from '@/lib/split-db';

type BalanceEntry = {
  key: string;
  name: string;
  linkedUserId: string | null;
  contactId: string | null;
  virtualAccountId: string | null;
  email: string | null;
  netAmount: number; // positive = they owe user; negative = user owes them
  hasOutstandingGroupBalances: boolean;
};

const app = new Hono().get('/', async c => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

  // Map keyed by `u:<userId>` (enrolled) or `c:<contactId>` (pending)
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
      balanceMap.set(key, { key, name, linkedUserId, contactId, virtualAccountId, email, netAmount: delta, hasOutstandingGroupBalances: false });
    }
  }

  // ── PART 1: User is CREDITOR ─────────────────────────────────────────────
  // Expenses created by user where user paid → others owe user their shares
  const creditorShares = await db
    .select({
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
    .where(
      and(
        eq(splitExpenses.createdByUserId, auth.userId),
        eq(splitExpenses.paidByUser, true),
        eq(splitExpenseShares.isUser, false)
      )
    );

  for (const s of creditorShares) {
    const key = s.linkedUserId ? `u:${s.linkedUserId}` : `c:${s.contactId}`;
    upsert(key, s.contactName, s.linkedUserId, s.contactId, s.virtualAccountId, s.email, s.shareAmount);
  }

  // ── PART 2: User is DEBTOR (own expense, contact paid) ───────────────────
  const creatorDebtShares = await db
    .select({
      shareAmount: splitExpenseShares.shareAmount,
      paidByContactId: splitExpenses.paidByContactId
    })
    .from(splitExpenseShares)
    .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
    .where(
      and(
        eq(splitExpenses.createdByUserId, auth.userId),
        eq(splitExpenseShares.isUser, true),
        isNotNull(splitExpenses.paidByContactId)
      )
    );

  if (creatorDebtShares.length > 0) {
    const payerContactIds = [
      ...new Set(creatorDebtShares.map(s => s.paidByContactId!).filter(Boolean))
    ];
    const payerMap = await batchResolveContacts(payerContactIds);

    for (const s of creatorDebtShares) {
      if (!s.paidByContactId) continue;
      const payer = payerMap.get(s.paidByContactId);
      if (!payer) continue;
      const key = payer.linkedUserId ? `u:${payer.linkedUserId}` : `c:${s.paidByContactId}`;
      upsert(key, payer.name, payer.linkedUserId, s.paidByContactId, payer.virtualAccountId, payer.email, -s.shareAmount);
    }
  }

  // ── PART 3: User is DEBTOR/CREDITOR (participant in someone else's expense) ─
  const userContactRecords = await db
    .select({ id: splitContacts.id })
    .from(splitContacts)
    .where(eq(splitContacts.linkedUserId, auth.userId));
  const userContactIds = userContactRecords.map(c => c.id);

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
      .innerJoin(splitContacts, eq(splitExpenseShares.contactId, splitContacts.id))
      .innerJoin(splitExpenses, eq(splitExpenseShares.expenseId, splitExpenses.id))
      .where(eq(splitContacts.linkedUserId, auth.userId));

    const relevantShares = participantShares.filter(s => s.createdByUserId !== auth.userId);
    if (relevantShares.length > 0) {
      // Batch-resolve creator names and local contact records for all creators
      const creatorUserIds = [...new Set(relevantShares.map(s => s.createdByUserId))];
      const [creatorNameMap, creatorEmailRows] = await Promise.all([
        batchResolveUserNames(creatorUserIds),
        db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, creatorUserIds))
      ]);
      const creatorEmailMap = new Map(creatorEmailRows.map(r => [r.id, r.email]));

      // Batch-resolve payer contacts (for paidByContactId case)
      const payerContactIds = [...new Set(relevantShares.filter(s => s.paidByContactId).map(s => s.paidByContactId!))];
      const payerContactMap = await batchResolveContacts(payerContactIds);

      // Batch-resolve local contact records the current user has for each creator
      const localContactRows = creatorUserIds.length > 0
        ? await db
          .select({ linkedUserId: splitContacts.linkedUserId, id: splitContacts.id, virtualAccountId: splitContacts.virtualAccountId })
          .from(splitContacts)
          .where(
            and(
              eq(splitContacts.createdByUserId, auth.userId),
              inArray(splitContacts.linkedUserId, creatorUserIds)
            )
          )
        : [];
      const localContactByLinkedUser = new Map(localContactRows.map(r => [r.linkedUserId!, r]));

      // For expenses where current user paid (via contact), batch-fetch creator shares
      const expenseIdsWhereIPaid = relevantShares
        .filter(s => s.paidByContactId && payerContactMap.get(s.paidByContactId)?.linkedUserId === auth.userId)
        .map(s => s.expenseId);

      const creatorShareByExpense = new Map<string, number>();
      if (expenseIdsWhereIPaid.length > 0) {
        const creatorShares = await db
          .select({ expenseId: splitExpenseShares.expenseId, shareAmount: splitExpenseShares.shareAmount })
          .from(splitExpenseShares)
          .where(and(
            inArray(splitExpenseShares.expenseId, expenseIdsWhereIPaid),
            eq(splitExpenseShares.isUser, true)
          ));
        for (const cs of creatorShares) creatorShareByExpense.set(cs.expenseId, cs.shareAmount);
      }

      for (const s of relevantShares) {
        const key = `u:${s.createdByUserId}`;
        const creatorName = creatorNameMap.get(s.createdByUserId) ?? 'Unknown';
        const creatorEmail = creatorEmailMap.get(s.createdByUserId) ?? null;
        const localContact = localContactByLinkedUser.get(s.createdByUserId) ?? null;

        if (s.paidByUser) {
          // Creator paid → current user owes creator
          upsert(key, creatorName, s.createdByUserId, localContact?.id ?? null, localContact?.virtualAccountId ?? null, creatorEmail, -s.shareAmount);
        } else if (s.paidByContactId) {
          const payerContact = payerContactMap.get(s.paidByContactId);
          if (payerContact?.linkedUserId === auth.userId) {
            // Current user paid → creator owes user the creator's own share
            const creatorShare = creatorShareByExpense.get(s.expenseId);
            if (creatorShare != null) {
              upsert(key, creatorName, s.createdByUserId, localContact?.id ?? null, localContact?.virtualAccountId ?? null, creatorEmail, creatorShare);
            }
          }
          // Note: if a third party paid, that case is handled from their own expense records
        }
      }
    }
  }

  // ── PART 4: Settlements ───────────────────────────────────────────────────

  // Own settlements: current user paid a contact
  const settlementsToContact = await db
    .select({ amount: splitSettlements.amount, toContactId: splitSettlements.toContactId })
    .from(splitSettlements)
    .where(
      and(
        eq(splitSettlements.createdByUserId, auth.userId),
        eq(splitSettlements.fromIsUser, true),
        isNotNull(splitSettlements.toContactId)
      )
    );

  // Own settlements: a contact paid the current user
  const settlementsFromContact = await db
    .select({ amount: splitSettlements.amount, fromContactId: splitSettlements.fromContactId })
    .from(splitSettlements)
    .where(
      and(
        eq(splitSettlements.createdByUserId, auth.userId),
        isNotNull(splitSettlements.fromContactId),
        eq(splitSettlements.toIsUser, true)
      )
    );

  // Batch-resolve all settlement contact IDs
  const settlementContactIds = [
    ...new Set([
      ...settlementsToContact.map(s => s.toContactId!).filter(Boolean),
      ...settlementsFromContact.map(s => s.fromContactId!).filter(Boolean)
    ])
  ];
  const settlementContactMap = await batchResolveContacts(settlementContactIds);

  for (const s of settlementsToContact) {
    if (!s.toContactId) continue;
    const r = settlementContactMap.get(s.toContactId);
    if (!r) continue;
    const key = r.linkedUserId ? `u:${r.linkedUserId}` : `c:${s.toContactId}`;
    upsert(key, r.name, r.linkedUserId, s.toContactId, r.virtualAccountId, r.email, s.amount);
  }

  for (const s of settlementsFromContact) {
    if (!s.fromContactId) continue;
    const r = settlementContactMap.get(s.fromContactId);
    if (!r) continue;
    const key = r.linkedUserId ? `u:${r.linkedUserId}` : `c:${s.fromContactId}`;
    upsert(key, r.name, r.linkedUserId, s.fromContactId, r.virtualAccountId, r.email, -s.amount);
  }

  // Cross-user settlements involving the current user
  if (userContactIds.length > 0) {
    const [othersPayingMe, mePaying] = await Promise.all([
      db.select({ amount: splitSettlements.amount, createdByUserId: splitSettlements.createdByUserId })
        .from(splitSettlements)
        .where(and(eq(splitSettlements.fromIsUser, true), inArray(splitSettlements.toContactId, userContactIds))),
      db.select({ amount: splitSettlements.amount, createdByUserId: splitSettlements.createdByUserId })
        .from(splitSettlements)
        .where(and(eq(splitSettlements.toIsUser, true), inArray(splitSettlements.fromContactId, userContactIds)))
    ]);

    // Batch-resolve names for all recording users
    const crossUserIds = [
      ...new Set([
        ...othersPayingMe.filter(s => s.createdByUserId !== auth.userId).map(s => s.createdByUserId),
        ...mePaying.filter(s => s.createdByUserId !== auth.userId).map(s => s.createdByUserId)
      ])
    ];
    const [crossNameMap, crossEmailRows, crossLocalContacts] = await Promise.all([
      batchResolveUserNames(crossUserIds),
      db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, crossUserIds)),
      crossUserIds.length > 0
        ? db.select({ linkedUserId: splitContacts.linkedUserId, id: splitContacts.id, virtualAccountId: splitContacts.virtualAccountId })
          .from(splitContacts)
          .where(and(eq(splitContacts.createdByUserId, auth.userId), inArray(splitContacts.linkedUserId, crossUserIds)))
        : Promise.resolve([])
    ]);
    const crossEmailMap = new Map(crossEmailRows.map(r => [r.id, r.email]));
    const crossLocalByLinked = new Map(crossLocalContacts.map(r => [r.linkedUserId!, r]));

    for (const s of othersPayingMe) {
      if (s.createdByUserId === auth.userId) continue;
      const key = `u:${s.createdByUserId}`;
      const name = crossNameMap.get(s.createdByUserId) ?? 'Unknown';
      const email = crossEmailMap.get(s.createdByUserId) ?? null;
      const lc = crossLocalByLinked.get(s.createdByUserId) ?? null;
      upsert(key, name, s.createdByUserId, lc?.id ?? null, lc?.virtualAccountId ?? null, email, -s.amount);
    }

    for (const s of mePaying) {
      if (s.createdByUserId === auth.userId) continue;
      const key = `u:${s.createdByUserId}`;
      const name = crossNameMap.get(s.createdByUserId) ?? 'Unknown';
      const email = crossEmailMap.get(s.createdByUserId) ?? null;
      const lc = crossLocalByLinked.get(s.createdByUserId) ?? null;
      upsert(key, name, s.createdByUserId, lc?.id ?? null, lc?.virtualAccountId ?? null, email, s.amount);
    }
  }

  // Resolve real names for enrolled users (overwrite any alias like "You")
  const enrolledKeys = Array.from(balanceMap.values())
    .filter(e => e.linkedUserId)
    .map(e => e.linkedUserId!);
  if (enrolledKeys.length > 0) {
    const nameMap = await batchResolveUserNames(enrolledKeys);
    for (const entry of balanceMap.values()) {
      if (entry.linkedUserId) {
        const resolved = nameMap.get(entry.linkedUserId);
        if (resolved) entry.name = resolved;
      }
    }
  }

  // Merge in contacts with no activity so they still appear in the People section
  const allContacts = await db
    .select({
      id: splitContacts.id,
      name: splitContacts.name,
      linkedUserId: splitContacts.linkedUserId,
      virtualAccountId: splitContacts.virtualAccountId,
      email: splitContacts.email
    })
    .from(splitContacts)
    .where(eq(splitContacts.createdByUserId, auth.userId));

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
        netAmount: 0,
        hasOutstandingGroupBalances: false
      });
    }
  }

  // Bidirectional visibility: enrolled users who have added the current user as a contact
  // should also appear in the current user's People section (even if the current user hasn't added them)
  const reverseContacts = await db
    .select({ createdByUserId: splitContacts.createdByUserId })
    .from(splitContacts)
    .where(eq(splitContacts.linkedUserId, auth.userId));

  const reverseUserIds = [...new Set(
    reverseContacts
      .map(r => r.createdByUserId)
      .filter(uid => uid !== auth.userId && !balanceMap.has(`u:${uid}`))
  )];

  if (reverseUserIds.length > 0) {
    const [reverseNames, reverseEmails, reverseLocalContacts] = await Promise.all([
      batchResolveUserNames(reverseUserIds),
      db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, reverseUserIds)),
      db
        .select({ linkedUserId: splitContacts.linkedUserId, id: splitContacts.id, virtualAccountId: splitContacts.virtualAccountId })
        .from(splitContacts)
        .where(and(eq(splitContacts.createdByUserId, auth.userId), inArray(splitContacts.linkedUserId, reverseUserIds)))
    ]);

    const reverseEmailMap = new Map(reverseEmails.map(r => [r.id, r.email]));
    const reverseLocalByLinked = new Map(reverseLocalContacts.map(r => [r.linkedUserId!, r]));

    for (const uid of reverseUserIds) {
      const key = `u:${uid}`;
      if (balanceMap.has(key)) continue;
      const name = reverseNames.get(uid) ?? 'Unknown';
      const email = reverseEmailMap.get(uid) ?? null;
      const localContact = reverseLocalByLinked.get(uid) ?? null;
      balanceMap.set(key, {
        key,
        name,
        linkedUserId: uid,
        contactId: localContact?.id ?? null,
        virtualAccountId: localContact?.virtualAccountId ?? null,
        email,
        netAmount: 0,
        hasOutstandingGroupBalances: false
      });
    }
  }

  // For enrolled contacts with netAmount === 0, check if any shared group still has an outstanding balance
  // (cross-group offsets that cancel globally but are non-zero per group).
  const balances = Array.from(balanceMap.values()).filter(b => b.linkedUserId !== auth.userId);

  await Promise.all(
    balances
      .filter(b => b.linkedUserId && b.netAmount === 0)
      .map(async b => {
        b.hasOutstandingGroupBalances = await hasOutstandingGroupBalance(auth.userId, b.linkedUserId!);
      })
  );

  return c.json({ data: balances });
});

export default app;
