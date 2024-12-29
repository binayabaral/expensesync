import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gte, lt, lte, sql, sum } from 'drizzle-orm';
import { subDays, parse, differenceInDays, startOfMonth, endOfDay, startOfDay } from 'date-fns';

import { db } from '@/db/drizzle';
import { accounts, categories, transactions } from '@/db/schema';
import { calculatePercentageChange, fillMissingDays } from '@/lib/utils';

const app = new Hono().get(
  '/',
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

    const periodLength = differenceInDays(endDate, startDate) + 1;

    const lastPeriodEndDate = subDays(endDate, periodLength);
    const lastPeriodStartDate = subDays(startDate, periodLength);

    const fetchFinancialData = async (userId: string, from: Date, to: Date) => {
      return db
        .select({
          income: sql`SUM(CASE WHEN ${transactions.amount} >=0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number),
          expenses: sql`SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(
            Number
          ),
          remaining: sum(transactions.amount).mapWith(Number)
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            accountId ? eq(transactions.accountId, accountId) : undefined,
            eq(accounts.userId, userId),
            gte(transactions.date, from),
            lte(transactions.date, to)
          )
        );
    };

    const [[currentPeriod], [lastPeriod]] = await Promise.all([
      fetchFinancialData(auth.userId, startDate, endDate),
      fetchFinancialData(auth.userId, lastPeriodStartDate, lastPeriodEndDate)
    ]);

    const incomeChange = calculatePercentageChange(currentPeriod.income, lastPeriod.income);
    const expenseChange = calculatePercentageChange(currentPeriod.expenses, lastPeriod.expenses);
    const remainingChange = calculatePercentageChange(currentPeriod.remaining, lastPeriod.remaining);

    const transactionsByCategory = await db
      .select({
        name: categories.name,
        value: sql`SUM(ABS(${transactions.amount}))`.mapWith(Number)
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          lt(transactions.amount, 0),
          lte(transactions.date, endDate),
          eq(accounts.userId, auth.userId),
          gte(transactions.date, startDate),
          accountId ? eq(transactions.accountId, accountId) : undefined
        )
      )
      .groupBy(categories.name)
      .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`));

    const activeDays = await db
      .select({
        date: transactions.date,
        income: sql`SUM (CASE WHEN ${transactions.amount} >=0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number),
        expenses: sql`SUM (CASE WHEN ${transactions.amount} <0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number)
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          lte(transactions.date, endDate),
          eq(accounts.userId, auth.userId),
          gte(transactions.date, startDate),
          accountId ? eq(transactions.accountId, accountId) : undefined
        )
      )
      .groupBy(transactions.date)
      .orderBy(transactions.date);

    const days = fillMissingDays(activeDays, startDate, endDate);

    return c.json({
      data: {
        remainingAmount: currentPeriod.remaining,
        remainingChange,
        incomeAmount: currentPeriod.income,
        incomeChange,
        expensesAmount: currentPeriod.expenses,
        expenseChange,
        categories: transactionsByCategory,
        days
      }
    });
  }
);

export default app;
