import { z } from 'zod';
import { Hono } from 'hono';
import { endOfDay } from 'date-fns';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { and, count, eq, inArray, sql, sum } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, recurringPayments, transactions } from '@/db/schema';

import { fetchAccountBalance } from '../utils/common';

const app = new Hono()
  .get('/', async c => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const loanAccounts = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        accountType: accounts.accountType,
        loanSubType: accounts.loanSubType,
        loanTenureMonths: accounts.loanTenureMonths,
        emiIntervalMonths: accounts.emiIntervalMonths,
        apr: accounts.apr,
        paymentDueDay: accounts.paymentDueDay,
        isClosed: accounts.isClosed,
        closedAt: accounts.closedAt,
        isHidden: accounts.isHidden
      })
      .from(accounts)
      .where(and(eq(accounts.userId, auth.userId), eq(accounts.accountType, 'LOAN'), eq(accounts.isDeleted, false)));

    const today = endOfDay(new Date());

    const result = await Promise.all(
      loanAccounts.map(async loan => {
        const [{ balance: currentBalance }] = await fetchAccountBalance(auth.userId!, today, loan.id, true);

        // Payment history: all positive transfer transactions credited to this loan account
        const paymentHistory = await db
          .select({
            id: transactions.id,
            date: transactions.date,
            amount: transactions.amount,
            notes: transactions.notes
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, loan.id),
              sql`${transactions.amount} > 0`,
              inArray(transactions.type, ['PEER_TRANSFER', 'SELF_TRANSFER'])
            )
          )
          .orderBy(sql`${transactions.date} DESC`);

        // Borrowing history: negative transfer transactions (new disbursements / top-ups)
        const borrowingHistory = await db
          .select({
            id: transactions.id,
            date: transactions.date,
            amount: transactions.amount,
            notes: transactions.notes
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, loan.id),
              sql`${transactions.amount} < 0`,
              inArray(transactions.type, ['PEER_TRANSFER', 'SELF_TRANSFER'])
            )
          )
          .orderBy(sql`${transactions.date} DESC`);

        if (loan.loanSubType !== 'EMI') {
          const allTxDates = [...paymentHistory, ...borrowingHistory].map(t => new Date(t.date).getTime());
          const loanStartDate = allTxDates.length > 0 ? new Date(Math.min(...allTxDates)) : null;
          return {
            ...loan,
            currentBalance: currentBalance ?? 0,
            originalPrincipal: null,
            amountPaid: null,
            paymentCount: null,
            totalPayments: null,
            progressPercentage: null,
            linkedRecurringPayment: null,
            loanStartDate,
            paymentHistory,
            borrowingHistory
          };
        }

        // EMI-specific: derive originalPrincipal from INITIAL_BALANCE transaction
        const [initialBalanceTx] = await db
          .select({ amount: transactions.amount, date: transactions.date })
          .from(transactions)
          .where(and(eq(transactions.accountId, loan.id), eq(transactions.type, 'INITIAL_BALANCE')));

        const originalPrincipal = initialBalanceTx ? Math.abs(initialBalanceTx.amount) : 0;

        // amountPaid and paymentCount from positive transfer transactions
        const [paymentAgg] = await db
          .select({
            amountPaid: sum(transactions.amount).mapWith(Number),
            paymentCount: count(transactions.id)
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, loan.id),
              sql`${transactions.amount} > 0`,
              inArray(transactions.type, ['PEER_TRANSFER', 'SELF_TRANSFER'])
            )
          );

        const amountPaid = paymentAgg?.amountPaid ?? 0;
        const paymentCount = paymentAgg?.paymentCount ?? 0;

        // Use count-based progress when loanTenureMonths is set (most accurate for fixed-term loans)
        // Falls back to amount-based when tenure is unknown
        const emiIntervalMonths = loan.emiIntervalMonths ?? 1;
        const progressPercentage = (() => {
          if (loan.loanTenureMonths && loan.loanTenureMonths > 0) {
            return paymentCount / (loan.loanTenureMonths / emiIntervalMonths);
          }
          if (originalPrincipal > 0) {
            return amountPaid / originalPrincipal;
          }
          // Open-ended: progress = paid / (paid + remaining balance)
          const remaining = Math.abs(currentBalance ?? 0);
          const total = amountPaid + remaining;
          return total > 0 ? amountPaid / total : 0;
        })();

        // Linked recurring payment: first where toAccountId = loan.id
        const [linkedRecurringPayment] = await db
          .select({
            id: recurringPayments.id,
            name: recurringPayments.name,
            amount: recurringPayments.amount,
            transferCharge: recurringPayments.transferCharge,
            cadence: recurringPayments.cadence,
            dayOfMonth: recurringPayments.dayOfMonth,
            month: recurringPayments.month,
            intervalMonths: recurringPayments.intervalMonths,
            isActive: recurringPayments.isActive
          })
          .from(recurringPayments)
          .where(and(eq(recurringPayments.userId, auth.userId!), eq(recurringPayments.toAccountId, loan.id)));

        const totalPayments = loan.loanTenureMonths ? Math.round(loan.loanTenureMonths / emiIntervalMonths) : null;

        return {
          ...loan,
          currentBalance: currentBalance ?? 0,
          originalPrincipal,
          amountPaid,
          paymentCount,
          totalPayments,
          progressPercentage,
          linkedRecurringPayment: linkedRecurringPayment ?? null,
          loanStartDate: initialBalanceTx?.date ?? null,
          paymentHistory,
          borrowingHistory
        };
      })
    );

    return c.json({ data: result });
  })
  .patch(
    '/:id/close',
    zValidator('param', z.object({ id: z.string() })),
    async c => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [existingAccount] = await db
        .select({ id: accounts.id, accountType: accounts.accountType })
        .from(accounts)
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id), eq(accounts.isClosed, false)));

      if (!existingAccount) {
        return c.json({ error: 'Not found' }, 404);
      }

      if (existingAccount.accountType !== 'LOAN') {
        return c.json({ error: 'Only loan accounts can be closed' }, 400);
      }

      const today = new Date().toISOString().split('T')[0];

      const [updatedAccount] = await db
        .update(accounts)
        .set({ isClosed: true, closedAt: today })
        .where(and(eq(accounts.userId, auth.userId), eq(accounts.id, id)))
        .returning();

      // Deactivate linked recurring payment if any
      const [linkedRecurringPayment] = await db
        .select({ id: recurringPayments.id })
        .from(recurringPayments)
        .where(and(eq(recurringPayments.userId, auth.userId), eq(recurringPayments.toAccountId, id)));

      if (linkedRecurringPayment) {
        await db
          .update(recurringPayments)
          .set({ isActive: false })
          .where(eq(recurringPayments.id, linkedRecurringPayment.id));
      }

      return c.json({ data: updatedAccount });
    }
  );

export default app;
