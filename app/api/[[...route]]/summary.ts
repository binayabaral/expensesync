import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gte, lt, lte, sql } from 'drizzle-orm';
import { subDays, parse, differenceInDays, startOfMonth, endOfDay, startOfDay } from 'date-fns';

import { db } from '@/db/drizzle';
import { accounts, categories, transactions } from '@/db/schema';
import { calculatePercentageChange, fillMissingDays } from '@/lib/utils';

import { fetchAccountBalance, fetchFinancialData } from '../utils/common';

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

    const [[currentPeriod], [lastPeriod], [{ balance: remainingBalance }], [{ balance: previousRemainingBalance }]] =
      await Promise.all([
        fetchFinancialData(auth.userId, startDate, endDate, accountId),
        fetchFinancialData(auth.userId, lastPeriodStartDate, lastPeriodEndDate, accountId),
        fetchAccountBalance(auth.userId, defaultTo, accountId),
        fetchAccountBalance(auth.userId, lastPeriodEndDate, accountId)
      ]);

    const incomeChange = calculatePercentageChange(currentPeriod.income || 0, lastPeriod.income || 0);
    const expenseChange = calculatePercentageChange(currentPeriod.expenses || 0, lastPeriod.expenses || 0);
    const remainingChange = calculatePercentageChange(remainingBalance || 0, previousRemainingBalance || 0);

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
        income:
          sql`SUM (CASE WHEN ${transactions.amount} >=0 AND ${transactions.type} = 'USER_CREATED' THEN ${transactions.amount} ELSE 0 END)`.mapWith(
            Number
          ),
        expenses:
          sql`SUM (CASE WHEN ${transactions.amount} <0 AND ${transactions.type} = 'USER_CREATED' THEN ${transactions.amount} ELSE 0 END)`.mapWith(
            Number
          )
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
        remainingAmount: remainingBalance,
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
