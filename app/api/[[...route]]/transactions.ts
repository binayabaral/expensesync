import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { endOfDay, parse, startOfDay, startOfMonth } from 'date-fns';

import { db } from '@/db/drizzle';
import { transactions, insertTransactionSchema, categories, accounts } from '@/db/schema';

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

      const data = await db
        .select({
          id: transactions.id,
          type: transactions.type,
          date: transactions.date,
          account: accounts.name,
          category: categories.name,
          payee: transactions.payee,
          notes: transactions.notes,
          amount: transactions.amount,
          accountId: transactions.accountId,
          categoryId: transactions.categoryId
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            accountId ? eq(transactions.accountId, accountId) : undefined,
            eq(accounts.userId, auth.userId),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .orderBy(desc(transactions.date));

      return c.json({ data });
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
          id: transactions.id,
          date: transactions.date,
          type: transactions.type,
          payee: transactions.payee,
          notes: transactions.notes,
          amount: transactions.amount,
          accountId: transactions.accountId,
          categoryId: transactions.categoryId
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  )
  .post('/', zValidator('json', insertTransactionSchema.omit({ id: true })), async c => {
    const auth = getAuth(c);
    const values = c.req.valid('json');

    if (!auth?.userId || (values.type && values.type !== 'USER_CREATED')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const [insertedData] = await db
      .insert(transactions)
      .values({
        id: createId(),
        ...values
      })
      .returning();

    return c.json({ data: insertedData });
  })
  .post('/bulk-create', zValidator('json', z.array(insertTransactionSchema.omit({ id: true }))), async c => {
    const auth = getAuth(c);
    const values = c.req.valid('json');

    if (!auth?.userId || values.some(value => value.type !== 'USER_CREATED')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const insertedData = await db
      .insert(transactions)
      .values(values.map(value => ({ id: createId(), ...value })))
      .returning();

    return c.json({ data: insertedData });
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

      const transactionsToDelete = db.$with('transactions_to_delete').as(
        db
          .select({ id: transactions.id })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              inArray(transactions.id, values.ids),
              eq(accounts.userId, auth.userId),
              eq(transactions.type, 'USER_CREATED')
            )
          )
      );

      const data = await db
        .with(transactionsToDelete)
        .delete(transactions)
        .where(inArray(transactions.id, sql`(select id from ${transactionsToDelete})`))
        .returning({ id: transactions.id });

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
    zValidator('json', insertTransactionSchema.omit({ id: true })),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const values = c.req.valid('json');

      if (!auth?.userId || (values.type && values.type !== 'USER_CREATED')) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existingTransaction] = await db
        .select()
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));

      if (!existingTransaction) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (existingTransaction.transactions.type !== 'USER_CREATED') {
        return c.json({ error: 'Unauthorized. This is a system generated transaction and cannot be edited' }, 401);
      }

      const [data] = await db.update(transactions).set(values).where(eq(transactions.id, id)).returning();

      return c.json({ data });
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
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existingTransaction] = await db
        .select()
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));

      if (!existingTransaction) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (existingTransaction.transactions.type !== 'USER_CREATED') {
        return c.json({ error: 'Unauthorized. This is a system generated transaction and cannot be deleted' }, 401);
      }

      const [data] = await db.delete(transactions).where(eq(transactions.id, id)).returning({ id: transactions.id });

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  );

export default app;
