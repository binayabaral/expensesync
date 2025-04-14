import { z } from 'zod';
import { Hono } from 'hono';
import { endOfDay } from 'date-fns';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, insertAccountSchema, transactions } from '@/db/schema';

import { fetchAccountBalance } from '../utils/common';

const app = new Hono()
  .get('/', async c => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const data = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        isHidden: accounts.isHidden
      })
      .from(accounts)
      .where(eq(accounts.userId, auth.userId))
      .orderBy(asc(accounts.isHidden));

    const today = new Date();
    const defaultTo = endOfDay(today);

    const result = await Promise.all(
      data.map(async item => {
        const [{ balance }] = await fetchAccountBalance(auth.userId, defaultTo, item.id, true);

        return {
          ...item,
          balance
        };
      })
    );

    const sortedByAccountNameAndIsHidden = result.sort((a, b) => {
      if (a.isHidden !== b.isHidden) {
        return a.isHidden === false ? -1 : 1;
      }

      return a.name.toLowerCase().localeCompare(b.name.toLocaleUpperCase());
    });

    return c.json({ data: sortedByAccountNameAndIsHidden });
  })
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
          id: accounts.id,
          name: accounts.name,
          isHidden: accounts.isHidden
        })
        .from(accounts)
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id)));

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  )
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        isHidden: z.boolean(),
        startingBalance: z.number()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [insertedData] = await db
        .insert(accounts)
        .values({
          id: createId(),
          userId: auth.userId,
          ...values
        })
        .returning();

      await db.insert(transactions).values({
        id: createId(),
        accountId: insertedData.id,
        amount: values.startingBalance,
        payee: 'Initial Balance',
        date: new Date(),
        type: 'INITIAL_BALANCE'
      });

      return c.json({ data: insertedData });
    }
  )
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

      const data = await db
        .delete(accounts)
        .where(and(eq(accounts.userId, auth.userId), inArray(accounts.id, values.ids)))
        .returning({ id: accounts.id });

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
    zValidator('json', insertAccountSchema.pick({ name: true, isHidden: true })),
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

      const [data] = await db
        .update(accounts)
        .set(values)
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id)))
        .returning();

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

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

      const [data] = await db
        .delete(accounts)
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id)))
        .returning({
          id: accounts.id
        });

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  );

export default app;
