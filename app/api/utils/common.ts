import { and, eq, gte, lt, lte, sql, sum, desc } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, categories, transactions, transfers } from '@/db/schema';

export const fetchFinancialData = async (userId: string, from: Date, to: Date, accountId?: string) => {
  return db
    .select({
      income:
        sql`SUM(CASE WHEN ${transactions.amount} >=0 AND ${transactions.type} IN ('USER_CREATED','ASSET_SELL') THEN ${transactions.amount} ELSE 0 END)`.mapWith(
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

export const fetchAccountBalance = async (userId: string, to: Date, accountId?: string, showHidden?: boolean, showDeleted?: boolean) => {
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
        showDeleted ? undefined : eq(accounts.isDeleted, false),
        lte(transactions.date, to),
        showHidden ? undefined : eq(accounts.isHidden, false)
      )
    );
};

export const fetchTransactionsByCategory = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  accountId?: string,
  expenseOnly: boolean = true
) => {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      value: expenseOnly
        ? sql`SUM(ABS(${transactions.amount}))`.mapWith(Number)
        : sql`SUM(${transactions.amount})`.mapWith(Number)
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        expenseOnly ? lt(transactions.amount, 0) : undefined,
        lte(transactions.date, endDate),
        eq(accounts.userId, userId),
        gte(transactions.date, startDate),
        accountId ? eq(transactions.accountId, accountId) : undefined
      )
    )
    .groupBy(categories.name, categories.id)
    .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`));
};

export const fetchTransferCharges = async (userId: string, startDate: Date, endDate: Date, accountId?: string) => {
  return db
    .select({
      totalCharges: sum(transfers.transferCharge).mapWith(Number)
    })
    .from(transfers)
    .where(
      and(
        eq(transfers.userId, userId),
        gte(transfers.date, startDate),
        lte(transfers.date, endDate),
        accountId ? eq(transfers.fromAccountId, accountId) : undefined
      )
    );
};

export const fetchTransactionsByPayee = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  accountId?: string,
  expenseOnly: boolean = true
) => {
  const results = await db
    .select({
      name: transactions.payee,
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
        gte(transactions.date, startDate),
        sql`${transactions.payee} != 'Transferred to another account'`,
        accountId ? eq(transactions.accountId, accountId) : undefined
      )
    )
    .groupBy(transactions.payee)
    .having(sql`SUM(ABS(${transactions.amount})) > 0`)
    .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`));

  if (results.length <= 10) {
    return results;
  }

  const top9 = results.slice(0, 9);
  const remaining = results.slice(9);
  const othersTotal = remaining.reduce((sum, item) => sum + item.value, 0);

  return [...top9, { name: 'Others', value: othersTotal }];
};
