import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { endOfDay, parse, startOfDay, startOfMonth } from 'date-fns';
import { aliasedTable, eq, gte, lte, and, or, inArray, sql, desc } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, creditCardStatements, insertTransferSchema, transactions, transfers } from '@/db/schema';

const normalizeStatementPayment = async (statementId: string, deltaAmount: number, paidAt?: Date) => {
  const [statement] = await db
    .select({
      id: creditCardStatements.id,
      paidAmount: creditCardStatements.paidAmount,
      paymentDueAmount: creditCardStatements.paymentDueAmount
    })
    .from(creditCardStatements)
    .where(eq(creditCardStatements.id, statementId));

  if (!statement) {
    return;
  }

  const nextPaidAmount = Math.max(0, statement.paidAmount + deltaAmount);
  const isPaid = nextPaidAmount >= statement.paymentDueAmount;

  await db
    .update(creditCardStatements)
    .set({
      paidAmount: nextPaidAmount,
      isPaid,
      paidAt: isPaid ? paidAt ?? new Date() : null
    })
    .where(eq(creditCardStatements.id, statementId));
};

const assertStatementForTransfer = async (userId: string, statementId: string, toAccountId?: string | null) => {
  if (!toAccountId) {
    return { error: 'Receiver account is required when applying a credit card statement payment' };
  }

  const [statement] = await db
    .select({
      id: creditCardStatements.id,
      accountId: creditCardStatements.accountId
    })
    .from(creditCardStatements)
    .innerJoin(accounts, eq(creditCardStatements.accountId, accounts.id))
    .where(and(eq(accounts.userId, userId), eq(creditCardStatements.id, statementId)));

  if (!statement) {
    return { error: 'Credit card statement not found' };
  }

  if (statement.accountId !== toAccountId) {
    return { error: 'Statement does not belong to the receiver account' };
  }

  const [account] = await db
    .select({ accountType: accounts.accountType })
    .from(accounts)
    .where(and(eq(accounts.id, toAccountId), eq(accounts.userId, userId)));

  if (!account || account.accountType !== 'CREDIT_CARD') {
    return { error: 'Receiver account must be a credit card' };
  }

  return { statementId: statement.id };
};

const app = new Hono()
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        accountId: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { from, to, accountId } = c.req.valid('query');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const today = new Date();
      const defaultTo = endOfDay(today);
      const defaultFrom = startOfMonth(today);

      const startDate = from ? startOfDay(parse(from, 'yyyy-MM-dd', new Date())) : defaultFrom;
      const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

      const toAccount = aliasedTable(accounts, 'toAccount');
      const fromAccount = aliasedTable(accounts, 'fromAccount');

      const userTransfers = await db
        .select({
          id: transfers.id,
          date: transfers.date,
          notes: transfers.notes,
          amount: transfers.amount,
          toAccount: sql<string>`CASE WHEN ${toAccount.isDeleted} THEN CONCAT(${toAccount.name}, ' (deleted account)') ELSE ${toAccount.name} END`,
          fromAccount: sql<string>`CASE WHEN ${fromAccount.isDeleted} THEN CONCAT(${fromAccount.name}, ' (deleted account)') ELSE ${fromAccount.name} END`,
          transferCharge: transfers.transferCharge
        })
        .from(transfers)
        .leftJoin(toAccount, eq(transfers.toAccountId, toAccount.id))
        .leftJoin(fromAccount, eq(transfers.fromAccountId, fromAccount.id))
        .where(
          and(
            lte(transfers.date, endDate),
            gte(transfers.date, startDate),
            eq(transfers.userId, auth.userId),
            accountId ? or(eq(transfers.toAccountId, accountId), eq(transfers.fromAccountId, accountId)) : undefined
          )
        )
        .orderBy(desc(transfers.date));

      return c.json({ data: userTransfers });
    }
  )
  .get(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [data] = await db
        .select({
          date: transfers.date,
          notes: transfers.notes,
          amount: transfers.amount,
          toAccountId: transfers.toAccountId,
          fromAccountId: transfers.fromAccountId,
          transferCharge: transfers.transferCharge,
          creditCardStatementId: transfers.creditCardStatementId
        })
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, auth.userId)));

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  )
  .post('/', zValidator('json', insertTransferSchema.omit({ id: true, userId: true })), async c => {
    const auth = getAuth(c);
    const values = c.req.valid('json');
    const { transferCharge = 0, fromAccountId, toAccountId, creditCardStatementId } = values;

    if (!fromAccountId && !toAccountId) {
      return c.json({ error: 'One of Sender or Receiver account is required' }, 400);
    }

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (creditCardStatementId) {
      const statementCheck = await assertStatementForTransfer(auth.userId, creditCardStatementId, toAccountId);
      if (statementCheck.error) {
        return c.json({ error: statementCheck.error }, 400);
      }
    }

    const loggedInUserAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, auth.userId));

    const loggedInUserAccountsIds = loggedInUserAccounts.map(account => account.id);

    if (
      (fromAccountId && !loggedInUserAccountsIds.includes(fromAccountId)) ||
      (toAccountId && !loggedInUserAccountsIds.includes(toAccountId))
    ) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const [insertedTransfer] = await db
        .insert(transfers)
        .values({
          id: createId(),
          date: values.date,
          userId: auth.userId,
          notes: values.notes,
          amount: values.amount,
          transferCharge: transferCharge,
          toAccountId: values.toAccountId,
          fromAccountId: values.fromAccountId,
          creditCardStatementId: values.creditCardStatementId ?? null
        })
        .returning();

      if (values.fromAccountId) {
        await db.insert(transactions).values({
          id: createId(),
          date: values.date,
          accountId: values.fromAccountId,
          transferId: insertedTransfer.id,
          notes: `TRANSFER: ${values.notes}`,
          amount: -values.amount - transferCharge,
          payee: 'Transferred to another account',
          type: values.toAccountId ? 'PEER_TRANSFER' : 'SELF_TRANSFER'
        });
      }

      if (values.toAccountId) {
        await db.insert(transactions).values({
          id: createId(),
          date: values.date,
          amount: values.amount,
          accountId: values.toAccountId,
          transferId: insertedTransfer.id,
          notes: `TRANSFER: ${values.notes}`,
          payee: 'Transferred from another account',
          type: values.fromAccountId ? 'PEER_TRANSFER' : 'SELF_TRANSFER'
        });
      }

      if (values.creditCardStatementId) {
        await normalizeStatementPayment(values.creditCardStatementId, values.amount, values.date);
      }

      return c.json({ data: insertedTransfer });
    } catch (error) {
      return c.json({ error: `Failed to insert transfer. error: ${error}` }, 500);
    }
  })
  .post(
    '/bulk-delete',
    zValidator(
      'json',
      z.object({
        ids: z.array(z.string())
      })
    ),
    async c => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const transfersToDelete = db.$with('transfers_to_delete').as(
        db
          .select({ id: transfers.id })
          .from(transfers)
          .where(and(inArray(transfers.id, values.ids), eq(transfers.userId, auth.userId)))
      );

      const data = await db
        .with(transfersToDelete)
        .delete(transfers)
        .where(inArray(transfers.id, sql`(select id from ${transfersToDelete})`))
        .returning({ id: transfers.id });

      return c.json({ data });
    }
  )
  .patch(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    zValidator('json', insertTransferSchema.omit({ id: true, userId: true })),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const values = c.req.valid('json');
      const { transferCharge = 0, fromAccountId, toAccountId, creditCardStatementId } = values;

      if (!fromAccountId && !toAccountId) {
        return c.json({ error: 'One of Sender or Receiver account is required' }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existingTransfer] = await db
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, auth.userId)));

      const relatedTransactions = await db.select().from(transactions).where(eq(transactions.transferId, id));
      const fromTransaction = relatedTransactions.find(transaction => transaction.amount < 0);
      const toTransaction = relatedTransactions.find(transaction => transaction.amount > 0);

      if (!existingTransfer) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (creditCardStatementId) {
        const statementCheck = await assertStatementForTransfer(auth.userId, creditCardStatementId, toAccountId);
        if (statementCheck.error) {
          return c.json({ error: statementCheck.error }, 400);
        }
      }

      const loggedInUserAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, auth.userId));

      const loggedInUserAccountsIds = loggedInUserAccounts.map(account => account.id);
      if (
        (values.fromAccountId && !loggedInUserAccountsIds.includes(values.fromAccountId)) ||
        (values.toAccountId && !loggedInUserAccountsIds.includes(values.toAccountId))
      ) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      try {
        const [data] = await db
          .update(transfers)
          .set({
            ...values,
            toAccountId: values.toAccountId?.length ? values.toAccountId : null,
            fromAccountId: values.fromAccountId?.length ? values.fromAccountId : null,
            creditCardStatementId: values.creditCardStatementId?.length ? values.creditCardStatementId : null
          })
          .where(eq(transfers.id, id))
          .returning();

        if (existingTransfer.creditCardStatementId) {
          await normalizeStatementPayment(
            existingTransfer.creditCardStatementId,
            -existingTransfer.amount,
            existingTransfer.date
          );
        }

        if (values.creditCardStatementId) {
          await normalizeStatementPayment(values.creditCardStatementId, values.amount, values.date);
        }

        if (values.fromAccountId && !fromTransaction) {
          await db.insert(transactions).values({
            id: createId(),
            transferId: id,
            date: values.date,
            accountId: values.fromAccountId,
            notes: `TRANSFER: ${values.notes}`,
            payee: 'Transferred to another account',
            amount: -values.amount - transferCharge,
            type: values.toAccountId ? 'PEER_TRANSFER' : 'SELF_TRANSFER'
          });
        } else if (values.fromAccountId && fromTransaction) {
          await db
            .update(transactions)
            .set({
              ...fromTransaction,
              date: values.date,
              accountId: values.fromAccountId,
              notes: `TRANSFER: ${values.notes}`,
              amount: -values.amount - transferCharge,
              type: values.toAccountId ? 'PEER_TRANSFER' : 'SELF_TRANSFER'
            })
            .where(eq(transactions.id, fromTransaction.id));
        } else if (!values.fromAccountId && fromTransaction) {
          await db.delete(transactions).where(eq(transactions.id, fromTransaction.id));
        }

        if (values.toAccountId && !toTransaction) {
          await db.insert(transactions).values({
            id: createId(),
            transferId: id,
            date: values.date,
            amount: values.amount,
            accountId: values.toAccountId,
            notes: `TRANSFER: ${values.notes}`,
            payee: 'Transferred from another account',
            type: values.fromAccountId ? 'PEER_TRANSFER' : 'SELF_TRANSFER'
          });
        } else if (values.toAccountId && toTransaction) {
          await db
            .update(transactions)
            .set({
              ...toTransaction,
              date: values.date,
              amount: values.amount,
              accountId: values.toAccountId,
              notes: `TRANSFER: ${values.notes}`,
              type: values.fromAccountId ? 'PEER_TRANSFER' : 'SELF_TRANSFER'
            })
            .where(eq(transactions.id, toTransaction.id));
        } else if (!values.toAccountId && toTransaction) {
          await db.delete(transactions).where(eq(transactions.id, toTransaction.id));
        }

        return c.json({ data });
      } catch (error) {
        return c.json({ error: `Failed to update transfer. error: ${error}` }, 500);
      }
    }
  )
  .delete(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Invalid id' }, 400);
      }

      const [existingTransfer] = await db
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, auth.userId)));

      if (!existingTransfer) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (existingTransfer.creditCardStatementId) {
        await normalizeStatementPayment(
          existingTransfer.creditCardStatementId,
          -existingTransfer.amount,
          existingTransfer.date
        );
      }

      const [data] = await db.delete(transfers).where(eq(transfers.id, id)).returning();

      return c.json({ data });
    }
  );

export default app;
