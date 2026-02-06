import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  getDaysInMonth,
  startOfDay
} from 'date-fns';
import { aliasedTable, and, eq, sql } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, categories, recurringPayments } from '@/db/schema';

const cadenceSchema = z.enum(['DAILY', 'MONTHLY', 'YEARLY']);
const typeSchema = z.enum(['TRANSACTION', 'TRANSFER']);

const baseRecurringPaymentSchema = z.object({
  name: z.string().min(1),
  type: typeSchema,
  cadence: cadenceSchema,
  amount: z.number().int().nonnegative(),
  transferCharge: z.number().int().nonnegative().optional(),
  accountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  toAccountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  startDate: z.coerce.date(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  isActive: z.boolean().optional()
});

const recurringPaymentSchema = baseRecurringPaymentSchema
  .refine(data => (data.type === 'TRANSFER' ? !!(data.accountId || data.toAccountId) : true), {
    message: 'Sender or receiver account is required for transfers',
    path: ['accountId']
  })
  .refine(data => (data.cadence === 'MONTHLY' ? !!data.dayOfMonth : true), {
    message: 'Day of month is required for monthly cadence',
    path: ['dayOfMonth']
  })
  .refine(data => (data.cadence === 'YEARLY' ? !!data.dayOfMonth && !!data.month : true), {
    message: 'Month and day are required for yearly cadence',
    path: ['month']
  });

const clampDayOfMonth = (date: Date, dayOfMonth: number) => {
  const maxDay = getDaysInMonth(date);
  return Math.min(dayOfMonth, maxDay);
};

const getNextDueDate = (item: {
  cadence: 'DAILY' | 'MONTHLY' | 'YEARLY';
  startDate: Date;
  lastCompletedAt: Date | null;
  dayOfMonth: number | null;
  month: number | null;
}) => {
  const today = startOfDay(new Date());
  let next = item.lastCompletedAt ? new Date(item.lastCompletedAt) : new Date(item.startDate);

  if (item.cadence === 'DAILY') {
    if (item.lastCompletedAt) {
      next = addDays(next, 1);
    }
  }

  if (item.cadence === 'MONTHLY') {
    const day = item.dayOfMonth ?? next.getDate();
    if (item.lastCompletedAt) {
      next = addMonths(next, 1);
    }
    next.setDate(clampDayOfMonth(next, day));
  }

  if (item.cadence === 'YEARLY') {
    const day = item.dayOfMonth ?? next.getDate();
    const month = item.month ? item.month - 1 : next.getMonth();
    if (item.lastCompletedAt) {
      next = addYears(next, 1);
    }
    next.setMonth(month);
    next.setDate(clampDayOfMonth(next, day));
  }

  while (next < today) {
    if (item.cadence === 'DAILY') {
      next = addDays(next, 1);
    } else if (item.cadence === 'MONTHLY') {
      next = addMonths(next, 1);
      const day = item.dayOfMonth ?? next.getDate();
      next.setDate(clampDayOfMonth(next, day));
    } else {
      next = addYears(next, 1);
      const day = item.dayOfMonth ?? next.getDate();
      const month = item.month ? item.month - 1 : next.getMonth();
      next.setMonth(month);
      next.setDate(clampDayOfMonth(next, day));
    }
  }

  return next;
};

const app = new Hono()
  .get('/', async c => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const toAccount = aliasedTable(accounts, 'toAccount');
    const fromAccount = aliasedTable(accounts, 'fromAccount');

    const data = await db
      .select({
        id: recurringPayments.id,
        name: recurringPayments.name,
        type: recurringPayments.type,
        cadence: recurringPayments.cadence,
        amount: recurringPayments.amount,
        transferCharge: recurringPayments.transferCharge,
        notes: recurringPayments.notes,
        startDate: recurringPayments.startDate,
        dayOfMonth: recurringPayments.dayOfMonth,
        month: recurringPayments.month,
        lastCompletedAt: recurringPayments.lastCompletedAt,
        isActive: recurringPayments.isActive,
        accountId: recurringPayments.accountId,
        toAccountId: recurringPayments.toAccountId,
        categoryId: recurringPayments.categoryId,
        account: sql<string>`CASE WHEN ${fromAccount.isDeleted} THEN CONCAT(${fromAccount.name}, ' (deleted account)') ELSE ${fromAccount.name} END`,
        toAccount: sql<string>`CASE WHEN ${toAccount.isDeleted} THEN CONCAT(${toAccount.name}, ' (deleted account)') ELSE ${toAccount.name} END`,
        category: categories.name
      })
      .from(recurringPayments)
      .leftJoin(fromAccount, eq(recurringPayments.accountId, fromAccount.id))
      .leftJoin(toAccount, eq(recurringPayments.toAccountId, toAccount.id))
      .leftJoin(categories, eq(recurringPayments.categoryId, categories.id))
      .where(eq(recurringPayments.userId, auth.userId));

    const enriched = data.map(item => {
      const nextDueDate = getNextDueDate({
        cadence: item.cadence,
        startDate: item.startDate,
        lastCompletedAt: item.lastCompletedAt,
        dayOfMonth: item.dayOfMonth,
        month: item.month
      });
      const daysRemaining = differenceInCalendarDays(nextDueDate, startOfDay(new Date()));

      return {
        ...item,
        nextDueDate,
        daysRemaining
      };
    });

    return c.json({ data: enriched });
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
          id: recurringPayments.id,
          name: recurringPayments.name,
          type: recurringPayments.type,
          cadence: recurringPayments.cadence,
          amount: recurringPayments.amount,
          transferCharge: recurringPayments.transferCharge,
          notes: recurringPayments.notes,
          startDate: recurringPayments.startDate,
          dayOfMonth: recurringPayments.dayOfMonth,
          month: recurringPayments.month,
          lastCompletedAt: recurringPayments.lastCompletedAt,
          isActive: recurringPayments.isActive,
          accountId: recurringPayments.accountId,
          toAccountId: recurringPayments.toAccountId,
          categoryId: recurringPayments.categoryId
        })
        .from(recurringPayments)
        .where(and(eq(recurringPayments.id, id), eq(recurringPayments.userId, auth.userId)));

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  )
  .post('/', zValidator('json', recurringPaymentSchema), async c => {
    const auth = getAuth(c);
    const values = c.req.valid('json');

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const [inserted] = await db
      .insert(recurringPayments)
      .values({
        id: createId(),
        userId: auth.userId,
        ...values
      })
      .returning();

    return c.json({ data: inserted });
  })
  .patch(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    zValidator('json', baseRecurringPaymentSchema.partial()),
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

      const [updated] = await db
        .update(recurringPayments)
        .set({
          ...values,
          updatedAt: new Date()
        })
        .where(and(eq(recurringPayments.id, id), eq(recurringPayments.userId, auth.userId)))
        .returning();

      return c.json({ data: updated });
    }
  )
  .patch(
    '/:id/complete',
    zValidator(
      'param',
      z.object({
        id: z.string().optional()
      })
    ),
    zValidator(
      'json',
      z.object({
        completedAt: z.coerce.date()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const { completedAt } = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [updated] = await db
        .update(recurringPayments)
        .set({
          lastCompletedAt: completedAt,
          updatedAt: new Date()
        })
        .where(and(eq(recurringPayments.id, id), eq(recurringPayments.userId, auth.userId)))
        .returning();

      return c.json({ data: updated });
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

      const [deleted] = await db
        .delete(recurringPayments)
        .where(and(eq(recurringPayments.id, id), eq(recurringPayments.userId, auth.userId)))
        .returning({ id: recurringPayments.id });

      return c.json({ data: deleted });
    }
  );

export default app;
