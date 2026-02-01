import { and, eq, gte, lt, lte, sql, desc } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, transactions } from '@/db/schema';

export const fetchTransactionsByPayee = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  accountId?: string,
  expenseOnly: boolean = true
) => {
  return db
    .select({
      payee: transactions.payee,
      value: expenseOnly
        ? sql`SUM(ABS(${transactions.amount}))`.mapWith(Number)
        : sql`SUM(${transactions.amount})`.mapWith(Number)
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        expenseOnly ? lt(transactions.amount, 0) : undefined,
        lte(transactions.date, endDate),
        eq(accounts.userId, userId),
        eq(transactions.type, 'USER_CREATED'),
        gte(transactions.date, startDate),
        accountId ? eq(transactions.accountId, accountId) : undefined
      )
    )
    .groupBy(transactions.payee)
    .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`));
};
