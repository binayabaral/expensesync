import { z } from 'zod';
import { Hono } from 'hono';
import { endOfDay, parse } from 'date-fns';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, insertAccountSchema, transactions } from '@/db/schema';

import { fetchAccountBalance } from '../utils/common';

const app = new Hono()
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        to: z.string().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { to } = c.req.valid('query');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const data = await db
        .select({
          id: accounts.id,
          name: accounts.name,
          isHidden: accounts.isHidden,
          accountType: accounts.accountType,
          creditLimit: accounts.creditLimit,
          apr: accounts.apr,
          statementCloseDay: accounts.statementCloseDay,
          statementCloseIsEom: accounts.statementCloseIsEom,
          paymentDueDay: accounts.paymentDueDay,
          paymentDueDays: accounts.paymentDueDays,
          minimumPaymentPercentage: accounts.minimumPaymentPercentage
        })
        .from(accounts)
        .where(and(eq(accounts.userId, auth.userId), to ? undefined : eq(accounts.isDeleted, false)))
        .orderBy(asc(accounts.isHidden));

      const today = new Date();
      const defaultTo = endOfDay(today);
      const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

      const result = await Promise.all(
        data.map(async item => {
          const [{ balance }] = await fetchAccountBalance(auth.userId, endDate, item.id, true);

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
          isHidden: accounts.isHidden,
          accountType: accounts.accountType,
          creditLimit: accounts.creditLimit,
          apr: accounts.apr,
          statementCloseDay: accounts.statementCloseDay,
          statementCloseIsEom: accounts.statementCloseIsEom,
          paymentDueDay: accounts.paymentDueDay,
          paymentDueDays: accounts.paymentDueDays,
          minimumPaymentPercentage: accounts.minimumPaymentPercentage
        })
        .from(accounts)
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id), eq(accounts.isDeleted, false)));

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
      z
        .object({
          name: z.string(),
          isHidden: z.boolean(),
          startingBalance: z.number(),
          accountType: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER']),
          creditLimit: z.number().nullable().optional(),
          apr: z.number().nullable().optional(),
          statementCloseDay: z.number().int().min(1).max(31).nullable().optional(),
          statementCloseIsEom: z.boolean().optional(),
          paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
          paymentDueDays: z.number().int().min(1).max(60).nullable().optional(),
          minimumPaymentPercentage: z.number().min(0).max(100).optional()
        })
        .refine(
          data =>
            data.accountType !== 'CREDIT_CARD' ||
            !!(data.statementCloseIsEom || data.statementCloseDay),
          {
            message: 'Statement close day or end of month is required for credit cards',
            path: ['statementCloseDay']
          }
        )
        .refine(
          data => data.accountType !== 'CREDIT_CARD' || !!(data.paymentDueDay || data.paymentDueDays),
          {
            message: 'Payment due day or grace period is required for credit cards',
            path: ['paymentDueDay']
          }
        )
    ),
    async c => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const isCreditCard = values.accountType === 'CREDIT_CARD';

      const [insertedData] = await db
        .insert(accounts)
        .values({
          id: createId(),
          userId: auth.userId,
          name: values.name,
          isHidden: values.isHidden,
          accountType: values.accountType,
          creditLimit: isCreditCard ? values.creditLimit ?? null : null,
          apr: isCreditCard ? values.apr ?? null : null,
          statementCloseDay: isCreditCard ? values.statementCloseDay ?? null : null,
          statementCloseIsEom: isCreditCard ? values.statementCloseIsEom ?? false : false,
          paymentDueDay: isCreditCard ? values.paymentDueDay ?? null : null,
          paymentDueDays: isCreditCard ? values.paymentDueDays ?? null : null,
          minimumPaymentPercentage: isCreditCard ? values.minimumPaymentPercentage ?? 2 : 2
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
        .update(accounts)
        .set({ isDeleted: true })
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
    zValidator(
      'json',
      insertAccountSchema
        .pick({
          name: true,
          isHidden: true,
          accountType: true,
          creditLimit: true,
          apr: true,
          statementCloseDay: true,
          statementCloseIsEom: true,
          paymentDueDay: true,
          paymentDueDays: true,
          minimumPaymentPercentage: true
        })
        .partial()
    ),
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

      const [existingAccount] = await db
        .select({
          accountType: accounts.accountType,
          statementCloseDay: accounts.statementCloseDay,
          statementCloseIsEom: accounts.statementCloseIsEom,
          paymentDueDay: accounts.paymentDueDay,
          paymentDueDays: accounts.paymentDueDays
        })
        .from(accounts)
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id), eq(accounts.isDeleted, false)));

      if (!existingAccount) {
        return c.json({ error: 'Not found' }, 404);
      }

      const nextAccountType = values.accountType ?? existingAccount.accountType;
      const nextStatementCloseIsEom = values.statementCloseIsEom ?? existingAccount.statementCloseIsEom;
      const nextStatementCloseDay = values.statementCloseDay ?? existingAccount.statementCloseDay;
      const nextPaymentDueDay = values.paymentDueDay ?? existingAccount.paymentDueDay;
      const nextPaymentDueDays = values.paymentDueDays ?? existingAccount.paymentDueDays;

      if (nextAccountType === 'CREDIT_CARD') {
        if (!nextStatementCloseIsEom && !nextStatementCloseDay) {
          return c.json({ error: 'Statement close day or end of month is required for credit cards' }, 400);
        }

        if (!nextPaymentDueDay && !nextPaymentDueDays) {
          return c.json({ error: 'Payment due day or grace period is required for credit cards' }, 400);
        }
      }

      const isCreditCard = values.accountType === 'CREDIT_CARD';
      const normalizedValues = {
        ...values,
        creditLimit: isCreditCard ? values.creditLimit : values.accountType ? null : values.creditLimit,
        apr: isCreditCard ? values.apr : values.accountType ? null : values.apr,
        statementCloseDay: isCreditCard ? values.statementCloseDay : values.accountType ? null : values.statementCloseDay,
        statementCloseIsEom: isCreditCard
          ? values.statementCloseIsEom ?? false
          : values.accountType
          ? false
          : values.statementCloseIsEom,
        paymentDueDay: isCreditCard ? values.paymentDueDay : values.accountType ? null : values.paymentDueDay,
        paymentDueDays: isCreditCard ? values.paymentDueDays : values.accountType ? null : values.paymentDueDays,
        minimumPaymentPercentage: isCreditCard
          ? values.minimumPaymentPercentage ?? 2
          : values.accountType
          ? 2
          : values.minimumPaymentPercentage
      };

      const [data] = await db
        .update(accounts)
        .set(normalizedValues)
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id), eq(accounts.isDeleted, false)))
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
        .update(accounts)
        .set({ isDeleted: true })
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id)))
        .returning({ id: accounts.id });

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  );

export default app;
