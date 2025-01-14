import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, transactions } from '@/db/schema';

export const fetchFinancialData = async (userId: string, from: Date, to: Date, accountId?: string) => {
  return db
    .select({
      income:
        sql`SUM(CASE WHEN ${transactions.amount} >=0 AND ${transactions.type} = 'USER_CREATED' THEN ${transactions.amount} ELSE 0 END)`.mapWith(
          Number
        ),
      expenses:
        sql`SUM(CASE WHEN ${transactions.amount} < 0 AND ${transactions.type} = 'USER_CREATED' THEN ${transactions.amount} ELSE 0 END)`.mapWith(
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

export const fetchAccountBalance = async (userId: string, to: Date, accountId?: string, showHidden?: boolean) => {
  return db
    .select({
      balance: sum(transactions.amount).mapWith(Number)
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        accountId ? eq(transactions.accountId, accountId) : undefined,
        eq(accounts.userId, userId),
        lte(transactions.date, to),
        showHidden ? undefined : eq(accounts.isHidden, false)
      )
    );
};
