import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { aliasedTable, eq, inArray, or, sql } from 'drizzle-orm';

import { db, type DbOrTx } from '@/db/drizzle';
import { SUPPORTED_CURRENCIES, splitContacts, splitGroupMembers, splitGroups, splitSettlements, transactions, transfers, users } from '@/db/schema';
import { computeGroupPairNet, ensureEnrolled } from '@/lib/split-db';
import { notifySettlementRecorded } from '@/lib/split-notifications';

async function resolveContactName(contactId: string): Promise<string> {
  const [row] = await db
    .select({ name: splitContacts.name, userName: users.name })
    .from(splitContacts)
    .leftJoin(users, eq(users.id, splitContacts.linkedUserId))
    .where(eq(splitContacts.id, contactId))
    .limit(1);
  if (!row) return 'Unknown';
  return row.userName ?? row.name;
}

const settlementInputSchema = z.object({
  groupId: z.string().nullable().optional(),
  fromIsUser: z.boolean(),
  fromContactId: z.string().nullable().optional(),
  toIsUser: z.boolean(),
  toContactId: z.string().nullable().optional(),
  amount: z.number().int().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  date: z.coerce.date(),
  accountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

async function resolveVirtualAccountId(userId: string, contactId: string | null, groupId: string | null): Promise<string | null> {
  if (groupId) {
    // Group context: find the current user's membership virtual account
    const members = await db
      .select({ virtualAccountId: splitGroupMembers.virtualAccountId, memberId: splitGroupMembers.userId })
      .from(splitGroupMembers)
      .where(eq(splitGroupMembers.groupId, groupId));
    return members.find(m => m.memberId === userId)?.virtualAccountId ?? null;
  }
  if (contactId) {
    // Standalone contact: find the virtual account for this contact (created by this user)
    const [contact] = await db
      .select({ virtualAccountId: splitContacts.virtualAccountId })
      .from(splitContacts)
      .where(eq(splitContacts.id, contactId))
      .limit(1);
    return contact?.virtualAccountId ?? null;
  }
  return null;
}

async function createSettlementTransfer(
  userId: string,
  fromIsUser: boolean,
  accountId: string,
  virtualAccountId: string | null,
  amount: number,
  date: Date,
  payee: string,
  systemNote: string,
  userNotes: string | null,
  dbOrTx: DbOrTx = db
): Promise<string> {
  const [insertedTransfer] = await dbOrTx
    .insert(transfers)
    .values({
      id: createId(),
      userId,
      amount,
      date,
      fromAccountId: fromIsUser ? accountId : (virtualAccountId ?? null),
      toAccountId: fromIsUser ? (virtualAccountId ?? null) : accountId,
      transferCharge: 0,
      notes: userNotes ?? null
    })
    .returning();

  // Transaction on the user's real account
  await dbOrTx.insert(transactions).values({
    id: createId(),
    date,
    amount: fromIsUser ? -amount : amount,
    accountId,
    transferId: insertedTransfer.id,
    payee,
    notes: systemNote,
    type: 'SELF_TRANSFER'
  });

  // Transaction on the virtual BILL_SPLIT account (offsetting side)
  if (virtualAccountId) {
    await dbOrTx.insert(transactions).values({
      id: createId(),
      date,
      amount: fromIsUser ? amount : -amount,
      accountId: virtualAccountId,
      transferId: insertedTransfer.id,
      payee,
      notes: systemNote,
      type: 'SELF_TRANSFER'
    });
  }

  return insertedTransfer.id;
}


const app = new Hono()
  // GET / — settlements visible to user
  .get('/', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    // Find groups where this user is a member (to show other members' settlements too)
    const memberGroupRows = await db
      .select({ groupId: splitGroupMembers.groupId })
      .from(splitGroupMembers)
      .where(eq(splitGroupMembers.userId, auth.userId));
    const memberGroupIds = memberGroupRows.map(r => r.groupId);

    const creatorUsers = db.select({ id: users.id, name: users.name }).from(users).as('creator_users');
    const fromContacts = aliasedTable(splitContacts, 'from_contacts');
    const toContacts = aliasedTable(splitContacts, 'to_contacts');

    const settlements = await db
      .select({
        id: splitSettlements.id,
        groupId: splitSettlements.groupId,
        createdByUserId: splitSettlements.createdByUserId,
        creatorName: creatorUsers.name,
        fromIsUser: splitSettlements.fromIsUser,
        fromContactId: splitSettlements.fromContactId,
        toIsUser: splitSettlements.toIsUser,
        toContactId: splitSettlements.toContactId,
        amount: splitSettlements.amount,
        currency: splitSettlements.currency,
        date: splitSettlements.date,
        transactionId: splitSettlements.transactionId,
        transferId: splitSettlements.transferId,
        settleGroupsBatchId: splitSettlements.settleGroupsBatchId,
        notes: splitSettlements.notes,
        createdAt: splitSettlements.createdAt,
        fromContactName: fromContacts.name,
        toContactName: toContacts.name,
        transferAccountId: sql<string | null>`COALESCE(${transfers.fromAccountId}, ${transfers.toAccountId})`
      })
      .from(splitSettlements)
      .leftJoin(fromContacts, eq(splitSettlements.fromContactId, fromContacts.id))
      .leftJoin(toContacts, eq(splitSettlements.toContactId, toContacts.id))
      .leftJoin(transfers, eq(splitSettlements.transferId, transfers.id))
      .leftJoin(creatorUsers, eq(splitSettlements.createdByUserId, creatorUsers.id))
      .where(
        or(
          eq(splitSettlements.createdByUserId, auth.userId),
          memberGroupIds.length > 0 ? inArray(splitSettlements.groupId, memberGroupIds) : undefined
        )
      )
      .orderBy(splitSettlements.date);

    return c.json({ data: settlements });
  })

  // POST / — create settlement
  .post(
    '/',
    zValidator('json', settlementInputSchema),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const values = c.req.valid('json');
      const { fromIsUser, fromContactId, toIsUser, toContactId, amount, date, accountId, notes } = values;
      const currency = values.currency ?? 'NPR';
      const groupId = values.groupId ?? null;

      // Resolve other party's contact ID and name
      const contactId = fromIsUser ? (toContactId ?? null) : (fromContactId ?? null);
      const contactName = contactId ? await resolveContactName(contactId) : 'Unknown';

      // Resolve the contact's linked userId (for cross-group distribution)
      const otherUserId = contactId
        ? (await db.select({ linkedUserId: splitContacts.linkedUserId }).from(splitContacts).where(eq(splitContacts.id, contactId)).limit(1))[0]?.linkedUserId ?? null
        : null;

      // ── Global settlement (no groupId) with an enrolled contact ──────────────
      // Distribute the amount across groups proportionally by outstanding balance.
      if (!groupId && otherUserId) {
        // Find all groups both users share
        const userGroupIds = (await db.select({ groupId: splitGroupMembers.groupId }).from(splitGroupMembers).where(eq(splitGroupMembers.userId, auth.userId))).map(r => r.groupId);
        const otherGroupIds = (await db.select({ groupId: splitGroupMembers.groupId }).from(splitGroupMembers).where(eq(splitGroupMembers.userId, otherUserId))).map(r => r.groupId);
        const sharedGroupIds = userGroupIds.filter(id => otherGroupIds.includes(id));

        // Compute net balance per group (in the same direction as the settlement)
        type GroupSlice = { groupId: string; net: number; virtualAccountId: string | null };
        const slices: GroupSlice[] = [];

        for (const gid of sharedGroupIds) {
          const net = await computeGroupPairNet(auth.userId, otherUserId, gid);
          const settlingPositive = fromIsUser ? net > 0 : net < 0; // paying reduces debt (net<0) or receiving reduces credit (net>0)
          const settlingNegative = fromIsUser ? net < 0 : net > 0;
          if (settlingNegative || settlingPositive) {
            // Include if balance is in the direction we're settling
            const relevantNet = fromIsUser ? Math.max(-net, 0) : Math.max(net, 0); // amount user owes (if paying) or is owed (if receiving)
            if (relevantNet > 0) {
              const virtualAccountId = await resolveVirtualAccountId(auth.userId, null, gid);
              slices.push({ groupId: gid, net: relevantNet, virtualAccountId });
            }
          }
        }

        const totalNet = slices.reduce((s, sl) => s + sl.net, 0);

        if (slices.length > 0 && totalNet > 0) {
          // Distribute proportionally, each group capped at its outstanding balance.
          // Any excess beyond total group balance becomes a standalone (null-groupId) settlement.
          let remaining = amount;
          const distributed: { groupId: string; amount: number; virtualAccountId: string | null }[] = [];

          for (let i = 0; i < slices.length; i++) {
            const slice = slices[i];
            if (remaining <= 0) break;
            const isLast = i === slices.length - 1;
            // Proportional share for non-last; remainder for last — but always cap at slice.net
            const raw = isLast ? remaining : Math.round((slice.net / totalNet) * amount);
            const portion = Math.min(raw, slice.net, remaining);
            if (portion > 0) distributed.push({ groupId: slice.groupId, amount: portion, virtualAccountId: slice.virtualAccountId });
            remaining -= portion;
          }

          // Pre-fetch all group names (reads outside the transaction)
          const groupNameResults = await Promise.all(
            distributed.map(d =>
              db.select({ name: splitGroups.name }).from(splitGroups).where(eq(splitGroups.id, d.groupId)).limit(1)
            )
          );
          const groupNames = groupNameResults.map(r => r[0]?.name ?? null);

          // All writes (transfer + settlement inserts) are atomic
          const created = await db.transaction(async (tx) => {
            let sharedTransferId: string | null = null;
            if (accountId && distributed.length > 0) {
              const firstGroupName = groupNames[0];
              const sysNote = firstGroupName
                ? `BILL SPLIT: settle with ${contactName} from group ${firstGroupName}`
                : `BILL SPLIT: settle with ${contactName}`;
              sharedTransferId = await createSettlementTransfer(
                auth.userId, fromIsUser, accountId, distributed[0].virtualAccountId,
                amount, date, contactName, sysNote, notes ?? null, tx
              );
            }

            const results = await Promise.all(distributed.map(async (d, i) => {
              const grpName = groupNames[i];
              const sysNote = grpName
                ? `BILL SPLIT: settle with ${contactName} from group ${grpName}`
                : `BILL SPLIT: settle with ${contactName}`;

              // Additional virtual account transaction for groups 2+ (real account handled above)
              const transferId: string | null = i === 0 ? sharedTransferId : null;
              if (accountId && i > 0 && d.virtualAccountId) {
                await tx.insert(transactions).values({
                  id: createId(), date, amount: fromIsUser ? d.amount : -d.amount,
                  accountId: d.virtualAccountId, payee: contactName, notes: sysNote, type: 'SELF_TRANSFER'
                });
              }

              const [s] = await tx.insert(splitSettlements).values({
                id: createId(), createdByUserId: auth.userId, groupId: d.groupId,
                fromIsUser, fromContactId: fromContactId ?? null,
                toIsUser, toContactId: toContactId ?? null,
                amount: d.amount, currency, date, transactionId: null, transferId, notes: notes ?? null
              }).returning();
              return s;
            }));

            // If settlement exceeds total group balance, create a standalone record for the remainder
            if (remaining > 0) {
              await tx.insert(splitSettlements).values({
                id: createId(), createdByUserId: auth.userId, groupId: null,
                fromIsUser, fromContactId: fromContactId ?? null,
                toIsUser, toContactId: toContactId ?? null,
                amount: remaining, currency, date, transactionId: null, transferId: null, notes: notes ?? null
              });
            }

            return results;
          });

          await notifySettlementRecorded({ id: created[0].id, amount }, otherUserId);
          return c.json({ data: created[0] });
        }
        // Fall through to create a standalone settlement if no matching groups found
      }

      // ── Single settlement (with groupId, or no shared groups) ─────────────────
      let groupName: string | null = null;
      if (groupId) {
        const [group] = await db.select({ name: splitGroups.name }).from(splitGroups).where(eq(splitGroups.id, groupId)).limit(1);
        groupName = group?.name ?? null;
      }

      const systemNote = groupName
        ? `BILL SPLIT: settle with ${contactName} from group ${groupName}`
        : `BILL SPLIT: settle with ${contactName}`;

      const virtualAccountId = await resolveVirtualAccountId(auth.userId, contactId, groupId);

      // Transfer creation + settlement insert are atomic
      const settlement = await db.transaction(async (tx) => {
        let transferId: string | null = null;
        if (accountId) {
          transferId = await createSettlementTransfer(auth.userId, fromIsUser, accountId, virtualAccountId, amount, date, contactName, systemNote, notes ?? null, tx);
        }

        const [settlement] = await tx
          .insert(splitSettlements)
          .values({
            id: createId(),
            createdByUserId: auth.userId,
            groupId,
            fromIsUser,
            fromContactId: fromContactId ?? null,
            toIsUser,
            toContactId: toContactId ?? null,
            amount,
            currency,
            date,
            transactionId: null,
            transferId,
            notes: notes ?? null
          })
          .returning();

        return settlement;
      });

      await notifySettlementRecorded({ id: settlement.id, amount }, otherUserId ?? null);

      return c.json({ data: settlement });
    }
  )

  // POST /settle-groups — settle all outstanding per-group balances between user and a contact.
  // Handles cross-group offsets (A owes B in one group, B owes A in another) by creating
  // settlements in both directions simultaneously, one per group. No real money transfers —
  // virtual account transactions are created to zero out each group's balance.
  .post(
    '/settle-groups',
    zValidator('json', z.object({ contactId: z.string(), date: z.coerce.date() })),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { contactId, date } = c.req.valid('json');

      const [contact] = await db.select().from(splitContacts).where(eq(splitContacts.id, contactId)).limit(1);
      if (!contact) return c.json({ error: 'Contact not found' }, 404);

      const otherUserId = contact.linkedUserId;
      if (!otherUserId) return c.json({ error: 'Contact is not enrolled — settle within a group instead' }, 400);

      const contactName = contact.linkedUserId
        ? ((await db.select({ name: users.name }).from(users).where(eq(users.id, contact.linkedUserId)).limit(1))[0]?.name ?? contact.name)
        : contact.name;

      const [userGroupRows, otherGroupRows] = await Promise.all([
        db.select({ groupId: splitGroupMembers.groupId }).from(splitGroupMembers).where(eq(splitGroupMembers.userId, auth.userId)),
        db.select({ groupId: splitGroupMembers.groupId }).from(splitGroupMembers).where(eq(splitGroupMembers.userId, otherUserId))
      ]);
      const otherGroupSet = new Set(otherGroupRows.map(r => r.groupId));
      const sharedGroupIds = userGroupRows.map(r => r.groupId).filter(id => otherGroupSet.has(id));

      const batchId = createId();

      // Pre-fetch all reads outside the transaction
      type SettleItem = {
        groupId: string;
        net: number;
        virtualAccountId: string | null;
        currency: typeof SUPPORTED_CURRENCIES[number];
        groupName: string;
      };
      const settleItems: SettleItem[] = [];

      for (const groupId of sharedGroupIds) {
        const net = await computeGroupPairNet(auth.userId, otherUserId, groupId);
        if (net === 0) continue;

        const [group] = await db
          .select({ name: splitGroups.name, currency: splitGroups.currency })
          .from(splitGroups).where(eq(splitGroups.id, groupId)).limit(1);
        const virtualAccountId = await resolveVirtualAccountId(auth.userId, null, groupId);
        settleItems.push({
          groupId,
          net,
          virtualAccountId,
          currency: group?.currency ?? 'NPR',
          groupName: group?.name ?? groupId
        });
      }

      if (settleItems.length === 0) return c.json({ error: 'No outstanding group balances to settle' }, 400);

      // All writes are atomic
      const created = await db.transaction(async (dbTx) => {
        const results: (typeof splitSettlements.$inferSelect)[] = [];

        for (const item of settleItems) {
          // Create a SELF_TRANSFER transaction on the user's virtual account to zero it out.
          // net > 0 → account is positive (others owe user) → debit it with -net
          // net < 0 → account is negative (user owes others) → credit it with +|net|
          let transactionId: string | null = null;
          if (item.virtualAccountId) {
            const [insertedTx] = await dbTx.insert(transactions).values({
              id: createId(),
              date,
              amount: -item.net,
              accountId: item.virtualAccountId,
              payee: contactName,
              notes: `BILL SPLIT: settle-groups with ${contactName} (${item.groupName})`,
              type: 'SELF_TRANSFER'
            }).returning();
            transactionId = insertedTx.id;
          }

          if (item.net > 0) {
            // Contact owes current user → contact is paying user
            const [s] = await dbTx.insert(splitSettlements).values({
              id: createId(), createdByUserId: auth.userId, groupId: item.groupId,
              fromIsUser: false, fromContactId: contactId,
              toIsUser: true, toContactId: null,
              amount: item.net, currency: item.currency, date,
              transactionId, transferId: null, settleGroupsBatchId: batchId, notes: null
            }).returning();
            results.push(s);
          } else {
            // Current user owes contact → user is paying contact
            const [s] = await dbTx.insert(splitSettlements).values({
              id: createId(), createdByUserId: auth.userId, groupId: item.groupId,
              fromIsUser: true, fromContactId: null,
              toIsUser: false, toContactId: contactId,
              amount: Math.abs(item.net), currency: item.currency, date,
              transactionId, transferId: null, settleGroupsBatchId: batchId, notes: null
            }).returning();
            results.push(s);
          }
        }

        return results;
      });

      await notifySettlementRecorded({ id: created[0].id, amount: created[0].amount }, otherUserId);
      return c.json({ data: created });
    }
  )

  // PATCH /:id — edit settlement
  .patch(
    '/:id',
    zValidator('json', settlementInputSchema),
    async c => {
      const auth = getAuth(c);
      if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
      if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

      const { id } = c.req.param();
      const values = c.req.valid('json');
      const { fromIsUser, fromContactId, toIsUser, toContactId, amount, date, accountId, notes } = values;
      const currency = values.currency ?? 'NPR';
      const groupId = values.groupId ?? null;

      const [existing] = await db.select().from(splitSettlements).where(eq(splitSettlements.id, id)).limit(1);
      if (!existing) return c.json({ error: 'Settlement not found' }, 404);
      if (existing.createdByUserId !== auth.userId) return c.json({ error: 'Only the creator can edit a settlement' }, 403);
      if (existing.settleGroupsBatchId) return c.json({ error: 'Settle-groups settlements cannot be edited' }, 403);

      // Resolve other party's name for payee
      const contactId = fromIsUser ? toContactId : fromContactId;
      const contactName = contactId ? await resolveContactName(contactId) : 'Unknown';

      let groupName: string | null = null;
      if (groupId) {
        const [group] = await db.select({ name: splitGroups.name }).from(splitGroups).where(eq(splitGroups.id, groupId)).limit(1);
        groupName = group?.name ?? null;
      }

      const systemNote = groupName
        ? `BILL SPLIT: settle with ${contactName} from group ${groupName}`
        : `BILL SPLIT: settle with ${contactName}`;

      const virtualAccountId = await resolveVirtualAccountId(auth.userId, contactId ?? null, groupId);

      // Handle transfer update and resolve final transferId
      let finalTransferId: string | null = existing.transferId ?? null;

      if (existing.transferId) {
        if (accountId) {
          // Update existing transfer
          await db.update(transfers).set({
            amount,
            date,
            fromAccountId: fromIsUser ? accountId : (virtualAccountId ?? null),
            toAccountId: fromIsUser ? (virtualAccountId ?? null) : accountId,
            notes: notes ?? null
          }).where(eq(transfers.id, existing.transferId));

          // Update both transactions linked to this transfer
          const txRows = await db.select().from(transactions).where(eq(transactions.transferId, existing.transferId));
          for (const tx of txRows) {
            const isVirtualSide = virtualAccountId && tx.accountId === virtualAccountId;
            await db.update(transactions).set({
              amount: isVirtualSide ? (fromIsUser ? amount : -amount) : (fromIsUser ? -amount : amount),
              date,
              accountId: isVirtualSide ? virtualAccountId : accountId,
              payee: contactName,
              notes: systemNote
            }).where(eq(transactions.id, tx.id));
          }
        } else {
          // User removed the account link — delete old transfer (cascades transactions)
          await db.delete(transfers).where(eq(transfers.id, existing.transferId));
          finalTransferId = null;
        }
      } else if (accountId) {
        // New account link — create transfer
        finalTransferId = await createSettlementTransfer(auth.userId, fromIsUser, accountId, virtualAccountId, amount, date, contactName, systemNote, notes ?? null);
      }

      const [updated] = await db
        .update(splitSettlements)
        .set({
          groupId,
          fromIsUser,
          fromContactId: fromContactId ?? null,
          toIsUser,
          toContactId: toContactId ?? null,
          amount,
          currency,
          date,
          notes: notes ?? null,
          transferId: finalTransferId
        })
        .where(eq(splitSettlements.id, id))
        .returning();

      return c.json({ data: updated });
    }
  )

  // DELETE /:id — delete settlement (creator only)
  .delete('/:id', async c => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!await ensureEnrolled(auth.userId)) return c.json({ error: 'Not enrolled' }, 403);

    const { id } = c.req.param();

    const [settlement] = await db.select().from(splitSettlements).where(eq(splitSettlements.id, id)).limit(1);
    if (!settlement) return c.json({ error: 'Settlement not found' }, 404);
    if (settlement.createdByUserId !== auth.userId) return c.json({ error: 'Only the creator can delete a settlement' }, 403);

    if (settlement.settleGroupsBatchId) {
      // Extract to a local const so TypeScript knows it's non-null inside the async callback
      const batchId = settlement.settleGroupsBatchId;

      // Delete all settlements in the same batch (all groups simultaneously)
      const batchSettlements = await db
        .select({ id: splitSettlements.id, transactionId: splitSettlements.transactionId, transferId: splitSettlements.transferId })
        .from(splitSettlements)
        .where(eq(splitSettlements.settleGroupsBatchId, batchId));

      await db.transaction(async (tx) => {
        for (const s of batchSettlements) {
          if (s.transferId) await tx.delete(transfers).where(eq(transfers.id, s.transferId));
          else if (s.transactionId) await tx.delete(transactions).where(eq(transactions.id, s.transactionId));
        }
        await tx.delete(splitSettlements).where(eq(splitSettlements.settleGroupsBatchId, batchId));
      });
    } else {
      await db.transaction(async (tx) => {
        if (settlement.transferId) {
          // Deleting the transfer cascades its transactions via transferId FK
          await tx.delete(transfers).where(eq(transfers.id, settlement.transferId));
        } else if (settlement.transactionId) {
          // Legacy: delete old USER_CREATED transaction
          await tx.delete(transactions).where(eq(transactions.id, settlement.transactionId));
        }
        await tx.delete(splitSettlements).where(eq(splitSettlements.id, id));
      });
    }

    return c.json({ data: { id } });
  });

export default app;
