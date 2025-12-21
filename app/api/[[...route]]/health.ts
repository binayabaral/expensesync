import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { asc, eq, and, sql, lte, or } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { eachMonthOfInterval, endOfDay, parse, startOfDay } from 'date-fns';

import { db } from '@/db/drizzle';
import { accounts, transactions, assets } from '@/db/schema';

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

    // Calculate assets value from unsold assets using total buying price
    const userAssets = await db
      .select({
        totalPaid: assets.totalPaid
      })
      .from(assets)
      .where(and(eq(assets.userId, auth.userId), eq(assets.isSold, false)));

    // Sum up the total buying price of all unsold assets
    const totalAssetsValue = userAssets.reduce((sum, asset) => sum + asset.totalPaid, 0);

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

    // Add assets value to the assets total
    result.assets += totalAssetsValue;
    result.netWorth = result.assets + result.liabilities;

    const intervals = eachMonthOfInterval({ start: startDate, end: endDate });

    const netWorthOverTime = await Promise.all(
      [...intervals, endDate].map(async date => {
        const [{ balance }] = await fetchAccountBalance(auth.userId, date, undefined, true, true);

        // Calculate assets value at this date (assets that existed and weren't sold yet)
        // Use total buying price (totalPaid) instead of current market price
        const assetsAtDate = await db
          .select({
            totalPaid: assets.totalPaid
          })
          .from(assets)
          .where(
            and(
              eq(assets.userId, auth.userId),
              // Asset was created before or on this date
              lte(assets.createdAt, date),
              // Asset wasn't sold yet, or was sold after this date
              or(
                eq(assets.isSold, false),
                sql`${assets.soldAt} > ${date}`
              )
            )
          );

        // Sum up the total buying price of all assets at this date
        const assetsValueAtDate = assetsAtDate.reduce((sum, asset) => sum + asset.totalPaid, 0);

        return {
          date,
          balance: (balance ?? 0) + assetsValueAtDate
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
