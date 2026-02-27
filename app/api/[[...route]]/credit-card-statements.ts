import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createId } from '@paralleldrive/cuid2';
import { zValidator } from '@hono/zod-validator';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { and, desc, eq, gte, lte, sum } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, creditCardStatements, transactions } from '@/db/schema';
import {
  getMostRecentStatementCloseDate,
  getPaymentDueDate,
  getPreviousStatementCloseDate
} from '@/lib/credit-cards';

const getLocalNow = (tzOffsetMinutes?: number) => {
  if (typeof tzOffsetMinutes !== 'number') {
    return new Date();
  }

  return new Date(Date.now() - tzOffsetMinutes * 60 * 1000);
};

const buildStatementPreview = async (userId: string, accountId: string, tzOffsetMinutes?: number) => {
  const [account] = await db
    .select({
      id: accounts.id,
      accountType: accounts.accountType,
      statementCloseDay: accounts.statementCloseDay,
      statementCloseIsEom: accounts.statementCloseIsEom,
      paymentDueDay: accounts.paymentDueDay,
      paymentDueDays: accounts.paymentDueDays,
      minimumPaymentPercentage: accounts.minimumPaymentPercentage
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId), eq(accounts.isDeleted, false)));

  if (!account || account.accountType !== 'CREDIT_CARD') {
    return { available: false, reason: 'Credit card account not found' } as const;
  }

  const localNow = startOfDay(getLocalNow(tzOffsetMinutes));
  const statementDate = getMostRecentStatementCloseDate(localNow, account);
  const previousCloseDate = getPreviousStatementCloseDate(statementDate, account);
  const periodStart = addDays(previousCloseDate, 1);
  const dueDate = getPaymentDueDate(statementDate, account);

  // Check for existing statement using UTC calendar date comparison
  // Extract the UTC calendar date (year, month, day) from the calculated statement date
  const stmtYear = statementDate.getUTCFullYear();
  const stmtMonth = statementDate.getUTCMonth();
  const stmtDay = statementDate.getUTCDate();
  
  // Create UTC day boundaries: start at 00:00:00.000 UTC, end at 23:59:59.999 UTC
  const dayStartUTC = new Date(Date.UTC(stmtYear, stmtMonth, stmtDay, 0, 0, 0, 0));
  const dayEndUTC = new Date(Date.UTC(stmtYear, stmtMonth, stmtDay, 23, 59, 59, 999));
  
  const [existingStatement] = await db
    .select({ id: creditCardStatements.id, statementDate: creditCardStatements.statementDate })
    .from(creditCardStatements)
    .where(
      and(
        eq(creditCardStatements.accountId, accountId),
        gte(creditCardStatements.statementDate, dayStartUTC),
        lte(creditCardStatements.statementDate, dayEndUTC)
      )
    );

  if (existingStatement) {
    return { available: false, reason: 'Statement already closed for this period' } as const;
  }

  const [totals] = await db
    .select({ total: sum(transactions.amount).mapWith(Number) })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        lte(transactions.date, endOfDay(statementDate))
      )
    );

  const periodBalance = totals?.total ?? 0;
  const statementBalance = Math.max(0, -periodBalance);
  const minimumPaymentPercentage = account.minimumPaymentPercentage ?? 2;
  const minimumPayment = Math.min(
    statementBalance,
    Math.ceil((statementBalance * minimumPaymentPercentage) / 100)
  );

  return {
    available: true,
    data: {
      accountId,
      periodStart,
      statementDate,
      dueDate,
      statementBalance,
      paymentDueAmount: statementBalance,
      minimumPayment,
      minimumPaymentPercentage
    }
  } as const;
};

const app = new Hono()
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        accountId: z.string().optional(),
        status: z.enum(['paid', 'unpaid']).optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { accountId, status } = c.req.valid('query');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const data = await db
        .select({
          id: creditCardStatements.id,
          accountId: creditCardStatements.accountId,
          periodStart: creditCardStatements.periodStart,
          statementDate: creditCardStatements.statementDate,
          dueDate: creditCardStatements.dueDate,
          statementBalance: creditCardStatements.statementBalance,
          paymentDueAmount: creditCardStatements.paymentDueAmount,
          isPaymentDueOverridden: creditCardStatements.isPaymentDueOverridden,
          minimumPayment: creditCardStatements.minimumPayment,
          paidAmount: creditCardStatements.paidAmount,
          isPaid: creditCardStatements.isPaid,
          paidAt: creditCardStatements.paidAt
        })
        .from(creditCardStatements)
        .innerJoin(accounts, eq(creditCardStatements.accountId, accounts.id))
        .where(
          and(
            eq(accounts.userId, auth.userId),
            accountId ? eq(creditCardStatements.accountId, accountId) : undefined,
            status === 'paid' ? eq(creditCardStatements.isPaid, true) : undefined,
            status === 'unpaid' ? eq(creditCardStatements.isPaid, false) : undefined
          )
        )
        .orderBy(desc(creditCardStatements.statementDate));

      return c.json({ data });
    }
  )
  .get(
    '/preview',
    zValidator(
      'query',
      z.object({
        accountId: z.string(),
        tzOffsetMinutes: z.coerce.number().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { accountId, tzOffsetMinutes } = c.req.valid('query');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const preview = await buildStatementPreview(auth.userId, accountId, tzOffsetMinutes);
      
      if (!preview.available) {
        return c.json({ available: false, reason: preview.reason });
      }

      return c.json({ available: true, data: preview.data });
    }
  )
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        accountId: z.string(),
        paymentDueAmountOverride: z.number().int().nonnegative().optional(),
        tzOffsetMinutes: z.number().optional()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { accountId, paymentDueAmountOverride, tzOffsetMinutes } = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const preview = await buildStatementPreview(auth.userId, accountId, tzOffsetMinutes);
      
      if (!preview.available) {
        return c.json({ error: preview.reason }, 400);
      }

      const paymentDueAmount =
        paymentDueAmountOverride !== undefined ? paymentDueAmountOverride : preview.data.paymentDueAmount;

      if (paymentDueAmount < preview.data.minimumPayment) {
        return c.json({ error: 'Payment due amount cannot be lower than minimum payment' }, 400);
      }

      const [inserted] = await db
        .insert(creditCardStatements)
        .values({
          id: createId(),
          userId: auth.userId,
          accountId: preview.data.accountId,
          periodStart: preview.data.periodStart,
          statementDate: preview.data.statementDate,
          dueDate: preview.data.dueDate,
          statementBalance: preview.data.statementBalance,
          paymentDueAmount,
          isPaymentDueOverridden: paymentDueAmount !== preview.data.paymentDueAmount,
          minimumPayment: preview.data.minimumPayment
        })
        .returning();

      return c.json({ data: inserted });
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
      z.object({
        paymentDueAmount: z.number().int().nonnegative()
      })
    ),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const { paymentDueAmount } = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!id) {
        return c.json({ error: 'Id is required' }, 400);
      }

      const [existing] = await db
        .select({
          id: creditCardStatements.id,
          minimumPayment: creditCardStatements.minimumPayment
        })
        .from(creditCardStatements)
        .innerJoin(accounts, eq(creditCardStatements.accountId, accounts.id))
        .where(and(eq(creditCardStatements.id, id), eq(accounts.userId, auth.userId)));

      if (!existing) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (paymentDueAmount < existing.minimumPayment) {
        return c.json({ error: 'Payment due amount cannot be lower than minimum payment' }, 400);
      }

      const [data] = await db
        .update(creditCardStatements)
        .set({
          paymentDueAmount,
          isPaymentDueOverridden: true
        })
        .where(eq(creditCardStatements.id, id))
        .returning();

      return c.json({ data });
    }
  );

export default app;
