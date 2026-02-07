import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { endOfDay, startOfDay, differenceInCalendarDays } from 'date-fns';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, creditCardStatements } from '@/db/schema';
import { fetchAccountBalance } from '../utils/common';

const app = new Hono().get('/', async c => {
  const auth = getAuth(c);

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
    .where(and(eq(accounts.userId, auth.userId), eq(accounts.accountType, 'CREDIT_CARD'), eq(accounts.isDeleted, false)))
    .orderBy(asc(accounts.name));

  const today = startOfDay(new Date());
  const defaultTo = endOfDay(today);

  const result = await Promise.all(
    data.map(async account => {
      const [{ balance }] = await fetchAccountBalance(auth.userId, defaultTo, account.id, true);
      const currentBalance = balance ?? 0;
      const currentOwed = Math.max(0, -currentBalance);
      const creditLimit = account.creditLimit ?? 0;
      const utilization = creditLimit > 0 ? currentOwed / creditLimit : null;

      const [nextStatement] = await db
        .select({
          id: creditCardStatements.id,
          statementDate: creditCardStatements.statementDate,
          dueDate: creditCardStatements.dueDate,
          statementBalance: creditCardStatements.statementBalance,
          paymentDueAmount: creditCardStatements.paymentDueAmount,
          minimumPayment: creditCardStatements.minimumPayment,
          paidAmount: creditCardStatements.paidAmount,
          isPaid: creditCardStatements.isPaid
        })
        .from(creditCardStatements)
        .where(and(eq(creditCardStatements.accountId, account.id), eq(creditCardStatements.isPaid, false)))
        .orderBy(asc(creditCardStatements.dueDate))
        .limit(1);

      const daysUntilDue = nextStatement?.dueDate
        ? differenceInCalendarDays(startOfDay(nextStatement.dueDate), today)
        : null;

      const interestEstimate =
        account.apr && nextStatement
          ? Math.max(0, Math.round((nextStatement.paymentDueAmount * (account.apr / 100)) / 12))
          : null;

      return {
        ...account,
        currentBalance,
        currentOwed,
        utilization,
        availableCredit: creditLimit > 0 ? Math.max(0, creditLimit - currentOwed) : null,
        nextStatement: nextStatement
          ? {
              ...nextStatement,
              daysUntilDue,
              interestEstimate
            }
          : null
      };
    })
  );

  return c.json({ data: result });
});

export default app;
