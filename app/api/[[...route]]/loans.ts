import { z } from 'zod';
import { Hono } from 'hono';
import { endOfDay } from 'date-fns';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { and, count, eq, inArray, sql, sum } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { accounts, recurringPayments, transactions } from '@/db/schema';

import { closeAccountsAndDeactivateRecurring, fetchAccountBalance } from '../utils/common';

const TRANSFER_TYPES = ['PEER_TRANSFER', 'SELF_TRANSFER'] as ('PEER_TRANSFER' | 'SELF_TRANSFER')[];

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
        isHidden: accounts.isHidden,
        currency: accounts.currency
      })
      .from(accounts)
      .where(and(eq(accounts.userId, auth.userId), eq(accounts.accountType, 'LOAN'), eq(accounts.isDeleted, false)));

    if (loanAccounts.length === 0) {
      return c.json({ data: [] });
    }

    const today = endOfDay(new Date());
    const loanIds = loanAccounts.map(l => l.id);

    // Batch all per-loan queries to avoid N+1
    const [
      balances,
      allTransferTxns,
      allInitialBalanceTxns,
      allPaymentAggs,
      allLinkedPayments
    ] = await Promise.all([
      // Balance per loan
      Promise.all(loanIds.map(id => fetchAccountBalance(auth.userId, today, id, true))),

      // All transfer transactions (payments + borrowings) for all loans
      db
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
          date: transactions.date,
          amount: transactions.amount,
          notes: transactions.notes,
          type: transactions.type
        })
        .from(transactions)
        .where(and(inArray(transactions.accountId, loanIds), inArray(transactions.type, TRANSFER_TYPES)))
        .orderBy(sql`${transactions.date} DESC`),

      // Initial balance transactions for EMI loans
      db
        .select({ accountId: transactions.accountId, amount: transactions.amount, date: transactions.date })
        .from(transactions)
        .where(and(inArray(transactions.accountId, loanIds), eq(transactions.type, 'INITIAL_BALANCE'))),

      // Payment aggregates (sum + count) for EMI loans
      db
        .select({
          accountId: transactions.accountId,
          amountPaid: sum(transactions.amount).mapWith(Number),
          paymentCount: count(transactions.id)
        })
        .from(transactions)
        .where(
          and(
            inArray(transactions.accountId, loanIds),
            sql`${transactions.amount} > 0`,
            inArray(transactions.type, TRANSFER_TYPES)
          )
        )
        .groupBy(transactions.accountId),

      // Linked recurring payments for all loans
      db
        .select({
          id: recurringPayments.id,
          name: recurringPayments.name,
          amount: recurringPayments.amount,
          transferCharge: recurringPayments.transferCharge,
          cadence: recurringPayments.cadence,
          dayOfMonth: recurringPayments.dayOfMonth,
          month: recurringPayments.month,
          intervalMonths: recurringPayments.intervalMonths,
          isActive: recurringPayments.isActive,
          toAccountId: recurringPayments.toAccountId
        })
        .from(recurringPayments)
        .where(and(eq(recurringPayments.userId, auth.userId), inArray(recurringPayments.toAccountId, loanIds)))
    ]);

    // Index batched results by accountId for O(1) lookup
    const balanceByLoanId = Object.fromEntries(loanIds.map((id, i) => [id, balances[i][0]?.balance ?? 0]));

    const paymentsByLoanId = allTransferTxns.filter(t => t.amount > 0).reduce<Record<string, typeof allTransferTxns>>(
      (acc, t) => { (acc[t.accountId] ??= []).push(t); return acc; }, {}
    );
    const borrowingsByLoanId = allTransferTxns.filter(t => t.amount < 0).reduce<Record<string, typeof allTransferTxns>>(
      (acc, t) => { (acc[t.accountId] ??= []).push(t); return acc; }, {}
    );
    const initialBalanceByLoanId = Object.fromEntries(allInitialBalanceTxns.map(t => [t.accountId, t]));
    const paymentAggByLoanId = Object.fromEntries(allPaymentAggs.map(a => [a.accountId, a]));
    const linkedPaymentByLoanId = Object.fromEntries(
      allLinkedPayments.map(p => [p.toAccountId!, p])
    );

    const result = loanAccounts.map(loan => {
      const currentBalance = balanceByLoanId[loan.id] ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const paymentHistory = (paymentsByLoanId[loan.id] ?? []).map(({ type: _type, accountId: _acc, ...rest }) => rest);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const borrowingHistory = (borrowingsByLoanId[loan.id] ?? []).map(({ type: _type, accountId: _acc, ...rest }) => rest);

      if (loan.loanSubType !== 'EMI') {
        const allTxDates = [...paymentHistory, ...borrowingHistory].map(t => new Date(t.date).getTime());
        const loanStartDate = allTxDates.length > 0 ? new Date(Math.min(...allTxDates)) : null;
        return {
          ...loan,
          currentBalance,
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

      const initialBalanceTx = initialBalanceByLoanId[loan.id];
      const originalPrincipal = initialBalanceTx ? Math.abs(initialBalanceTx.amount) : 0;

      const paymentAgg = paymentAggByLoanId[loan.id];
      const amountPaid = paymentAgg?.amountPaid ?? 0;
      const paymentCount = paymentAgg?.paymentCount ?? 0;

      const emiIntervalMonths = loan.emiIntervalMonths ?? 1;
      const progressPercentage = (() => {
        if (loan.loanTenureMonths && loan.loanTenureMonths > 0) {
          return paymentCount / (loan.loanTenureMonths / emiIntervalMonths);
        }
        const remaining = Math.abs(currentBalance);
        const total = amountPaid + remaining;
        return total > 0 ? amountPaid / total : 0;
      })();

      const linkedRecurringPayment = linkedPaymentByLoanId[loan.id] ?? null;
      const totalPayments = loan.loanTenureMonths ? Math.round(loan.loanTenureMonths / emiIntervalMonths) : null;

      return {
        ...loan,
        currentBalance,
        originalPrincipal,
        amountPaid,
        paymentCount,
        totalPayments,
        progressPercentage,
        linkedRecurringPayment,
        loanStartDate: initialBalanceTx?.date ?? null,
        paymentHistory,
        borrowingHistory
      };
    });

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

      const [closed] = await closeAccountsAndDeactivateRecurring(auth.userId, [id]);

      return c.json({ data: closed });
    }
  );

export default app;
