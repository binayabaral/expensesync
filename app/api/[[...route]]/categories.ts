import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { and, eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { endOfDay, endOfMonth, parse, startOfDay, startOfMonth, subMonths } from 'date-fns';

import { db } from '@/db/drizzle';
import { categories, insertCategorySchema } from '@/db/schema';

import { fetchTransactionsByCategory } from '../utils/common';

const app = new Hono()
  .get('/', async c => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const data = await db
      .select({
        id: categories.id,
        name: categories.name
      })
      .from(categories)
      .where(eq(categories.userId, auth.userId));

    return c.json({ data });
  })
  .get(
    '/with-expenses',
    zValidator(
      'query',
      z.object({
        to: z.string().optional(),
        from: z.string().optional(),
        accountId: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { to, from, accountId } = c.req.valid('query');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const today = new Date();
      const defaultTo = endOfDay(today);
      const defaultFrom = startOfMonth(today);

      const startDate = from ? startOfDay(parse(from, 'yyyy-MM-dd', new Date())) : defaultFrom;
      const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

      const allCategoriesPromise = db
        .select({
          id: categories.id,
          name: categories.name
        })
        .from(categories)
        .where(eq(categories.userId, auth.userId));

      const categoriesWithExpensesPromise = fetchTransactionsByCategory(
        auth.userId,
        startDate,
        endDate,
        accountId,
        false
      );

      const prevPeriods = Array.from({ length: 6 }).map((_, i) => {
        const offset = i + 1;
        const periodEnd = subMonths(endDate, offset);
        const periodStart = startOfMonth(periodEnd);
        const periodEndOfMonth = endOfMonth(periodEnd);

        return fetchTransactionsByCategory(auth.userId, periodStart, periodEndOfMonth, accountId, false);
      });

      const [allCategories, categoriesWithExpenses, ...categoriesWithExpensesPrevArr] = await Promise.all([
        allCategoriesPromise,
        categoriesWithExpensesPromise,
        ...prevPeriods
      ]);

      const nonEmptyPeriods = categoriesWithExpensesPrevArr.filter(
        periodData => periodData.length > 0 && periodData.some(item => item.value > 0)
      );

      const result = allCategories.map(allCategoriesItem => {
        const currentMatch = categoriesWithExpenses.find(item => item.id === allCategoriesItem.id);

        const prevAmounts = nonEmptyPeriods.map(periodData => {
          const match = periodData.find(item => item.id === allCategoriesItem.id);
          return match ? match.value : 0;
        });

        return {
          ...allCategoriesItem,
          amount: currentMatch ? currentMatch.value : 0,
          prevAmounts
        };
      });

      return c.json({ data: result });
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
          id: categories.id,
          name: categories.name
        })
        .from(categories)
        .where(and(eq(categories.userId, auth.userId), eq(categories.id, id)));

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
      insertCategorySchema.pick({
        name: true
      })
    ),
    async c => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [insertedData] = await db
        .insert(categories)
        .values({
          id: createId(),
          userId: auth.userId,
          ...values
        })
        .returning();

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
        .delete(categories)
        .where(and(eq(categories.userId, auth.userId), inArray(categories.id, values.ids)))
        .returning({ id: categories.id });

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
    zValidator('json', insertCategorySchema.pick({ name: true })),
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
        .update(categories)
        .set(values)
        .where(and(eq(categories.userId, auth.userId), eq(categories.id, id)))
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
        .delete(categories)
        .where(and(eq(categories.userId, auth.userId), eq(categories.id, id)))
        .returning({
          id: categories.id
        });

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  );

export default app;
