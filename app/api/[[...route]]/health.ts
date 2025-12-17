import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { asc, eq, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { eachMonthOfInterval, endOfDay, parse, startOfDay } from 'date-fns';

import { db } from '@/db/drizzle';
import { accounts, transactions } from '@/db/schema';

import { fetchAccountBalance } from '../utils/common';

const app = new Hono().get(
  '/',
  zValidator(
    'query',
    z.object({
      to: z.string().optional(),
      from: z.string().optional()
    })
  ),
  async c => {
    const auth = getAuth(c);
    const { to, from } = c.req.valid('query');

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let startDate;

    if (from) {
      startDate = startOfDay(parse(from, 'yyyy-MM-dd', new Date()));
    } else {
      const [{ date }] = await db
        .select({ date: transactions.date })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(eq(accounts.userId, auth.userId))
        .orderBy(asc(transactions.date))
        .limit(1);

      startDate = date;
    }

    const today = new Date();
    const defaultTo = endOfDay(today);
    const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

    const userAccounts = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        isHidden: accounts.isHidden
      })
      .from(accounts)
      .where(and(eq(accounts.userId, auth.userId), eq(accounts.isDeleted, false)))
      .orderBy(asc(accounts.isHidden));

    const userAccountsWithBalance = await Promise.all(
      userAccounts.map(async item => {
        const [{ balance }] = await fetchAccountBalance(auth.userId, endDate, item.id, true);

        return {
          ...item,
          balance
        };
      })
    );

    const result = userAccountsWithBalance.reduce(
      (acc, account) => {
        if (account.balance > 0) {
          acc.assets += account.balance;
        } else {
          acc.liabilities += account.balance;
        }
        acc.netWorth = acc.assets + acc.liabilities;

        return acc;
      },
      { assets: 0, liabilities: 0, netWorth: 0 }
    );

    const intervals = eachMonthOfInterval({ start: startDate, end: endDate });

    const netWorthOverTime = await Promise.all(
      [...intervals, endDate].map(async date => {
        const [{ balance }] = await fetchAccountBalance(auth.userId, date, undefined, true, true);

        return {
          date,
          balance
        };
      })
    );

    const cleanedNetWorthOverTime = netWorthOverTime.slice(netWorthOverTime.findIndex(item => item.balance !== null));

    return c.json({
      data: {
        summary: result,
        netWorthOverTime: cleanedNetWorthOverTime,
        dateInterval: { start: startDate, end: endDate }
      }
    });
  }
);

export default app;
