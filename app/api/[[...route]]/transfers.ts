import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { aliasedTable, eq, gte, lte, and, or, inArray, sql } from 'drizzle-orm';
import { endOfDay, parse, startOfDay, startOfMonth } from 'date-fns';

import { db } from '@/db/drizzle';
import { accounts, insertTransferSchema, transactions, transfers } from '@/db/schema';

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
          toAccount: toAccount.name,
          fromAccount: fromAccount.name
        })
        .from(transfers)
        .innerJoin(toAccount, eq(transfers.toAccountId, toAccount.id))
        .innerJoin(fromAccount, eq(transfers.fromAccountId, fromAccount.id))
        .where(
          and(
            lte(transfers.date, endDate),
            gte(transfers.date, startDate),
            eq(transfers.userId, auth.userId),
            accountId ? or(eq(transfers.toAccountId, accountId), eq(transfers.fromAccountId, accountId)) : undefined
          )
        );

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
          transferCharge: transfers.transferCharge
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
    const { transferCharge = 0 } = values;

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const loggedInUserAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, auth.userId));

    const loggedInUserAccountsIds = loggedInUserAccounts.map(account => account.id);
    if (
      !loggedInUserAccountsIds.includes(values.fromAccountId) ||
      !loggedInUserAccountsIds.includes(values.toAccountId)
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
          toAccountId: values.toAccountId,
          fromAccountId: values.fromAccountId,
          transferCharge: values.transferCharge || 0
        })
        .returning();

      await db.insert(transactions).values({
        id: createId(),
        date: values.date,
        notes: values.notes,
        type: 'SELF_TRANSFER',
        accountId: values.fromAccountId,
        transferId: insertedTransfer.id,
        amount: -values.amount - transferCharge,
        payee: 'Transferred to another account'
      });

      await db.insert(transactions).values({
        id: createId(),
        date: values.date,
        notes: values.notes,
        type: 'SELF_TRANSFER',
        amount: values.amount,
        accountId: values.toAccountId,
        transferId: insertedTransfer.id,
        payee: 'Transferred from another account'
      });

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

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existingTransaction] = await db
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), eq(transfers.userId, auth.userId)));

      const relatedTransactions = await db.select().from(transactions).where(eq(transactions.transferId, id));
      const fromTransaction = relatedTransactions.find(transaction => transaction.amount < 0);
      const toTransaction = relatedTransactions.find(transaction => transaction.amount > 0);

      if (!existingTransaction || !fromTransaction || !toTransaction) {
        return c.json({ error: 'Not found' }, 404);
      }

      const loggedInUserAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, auth.userId));

      const loggedInUserAccountsIds = loggedInUserAccounts.map(account => account.id);
      if (
        !loggedInUserAccountsIds.includes(values.fromAccountId) ||
        !loggedInUserAccountsIds.includes(values.toAccountId)
      ) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      try {
        const [data] = await db.update(transfers).set(values).where(eq(transfers.id, id)).returning();

        await db
          .update(transactions)
          .set({
            ...fromTransaction,
            date: values.date,
            notes: values.notes,
            accountId: values.fromAccountId,
            amount: -values.amount - (values.transferCharge || 0)
          })
          .where(eq(transactions.id, fromTransaction.id));

        await db
          .update(transactions)
          .set({
            ...toTransaction,
            date: values.date,
            notes: values.notes,
            amount: values.amount,
            accountId: values.toAccountId
          })
          .where(eq(transactions.id, toTransaction.id));

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

      const [data] = await db.delete(transfers).where(eq(transfers.id, id)).returning();

      return c.json({ data });
    }
  );

export default app;
