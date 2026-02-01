import { z } from 'zod';
import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { endOfDay, parse, startOfDay, startOfMonth, subMonths } from 'date-fns';

import { fetchTransactionsByPayee } from '../utils/payees';

const app = new Hono().get(
  '/with-expenses',
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

    const payeesWithExpensesPromise = fetchTransactionsByPayee(
      auth.userId,
      startDate,
      endDate,
      accountId,
      false
    );

    const prevPeriods = Array.from({ length: 6 }).map((_, i) => {
      const offset = i + 1;

      const periodStart = subMonths(startDate, offset);
      const periodEnd = subMonths(endDate, offset);

      return fetchTransactionsByPayee(auth.userId, periodStart, periodEnd, accountId, false);
    });

    const [payeesWithExpenses, ...payeesWithExpensesPrevArr] = await Promise.all([
      payeesWithExpensesPromise,
      ...prevPeriods
    ]);

    const nonEmptyPeriods = payeesWithExpensesPrevArr.slice(
      0,
      payeesWithExpensesPrevArr.findLastIndex(a => a.length > 0) + 1
    );

    // Get unique payees from all periods
    const allPayees = new Set<string>();
    payeesWithExpenses.forEach(item => allPayees.add(item.payee));
    nonEmptyPeriods.forEach(period => period.forEach(item => allPayees.add(item.payee)));

    const result = Array.from(allPayees).map(payee => {
      const currentMatch = payeesWithExpenses.find(item => item.payee === payee);

      const prevAmounts = nonEmptyPeriods.map(periodData => {
        const match = periodData.find(item => item.payee === payee);
        return match ? match.value : 0;
      });

      return {
        payee,
        amount: currentMatch ? currentMatch.value : 0,
        prevAmounts
      };
    });

    // Sort by amount descending
    result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return c.json({ data: result });
  }
);

export default app;
