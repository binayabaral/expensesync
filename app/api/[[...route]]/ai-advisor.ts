import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { and, desc, eq, gte, isNotNull, lte, ne, sql } from 'drizzle-orm';
import { subDays, endOfDay, startOfDay, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { db } from '@/db/drizzle';
import { accounts, assets, assetPrices, categories, creditCardStatements, recurringPayments, transactions } from '@/db/schema';
import {
  fetchAccountBalance,
  fetchFinancialData,
  fetchTransactionsByCategory,
  fetchTransactionsByPayee
} from '../utils/common';

const toNPR = (mili: number | null | undefined) => {
  const val = Math.round((mili ?? 0) / 1000);
  return `NPR ${val.toLocaleString('en-US')}`;
};

const pct = (value: number, total: number) =>
  total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;

const app = new Hono().post('/', async c => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401);

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return c.json({ error: 'AI service not configured' }, 500);

  const now = new Date();
  const today = endOfDay(now);
  const ninetyDaysAgo = startOfDay(subDays(now, 90));
  const oneEightyDaysAgo = startOfDay(subDays(now, 180));

  const month0Start = startOfMonth(now);
  const month0End = endOfMonth(now);
  const month1Start = startOfMonth(subMonths(now, 1));
  const month1End = endOfMonth(subMonths(now, 1));
  const month2Start = startOfMonth(subMonths(now, 2));
  const month2End = endOfMonth(subMonths(now, 2));

  const [
    allAccounts,
    [current90],
    [prior90],
    [month0Data],
    [month1Data],
    [month2Data],
    categorySpending,
    topPayees,
    unpaidStatements,
    recentPaidStatements,
    activeRecurring,
    unsoldAssets,
    allPrices,
    notedTransactions
  ] = await Promise.all([
    db.select({
      id: accounts.id,
      name: accounts.name,
      accountType: accounts.accountType,
      creditLimit: accounts.creditLimit,
      apr: accounts.apr,
      loanSubType: accounts.loanSubType,
      paymentDueDay: accounts.paymentDueDay,
      currency: accounts.currency
    })
      .from(accounts)
      .where(and(
        eq(accounts.userId, auth.userId),
        eq(accounts.isDeleted, false),
        ne(accounts.accountType, 'BILL_SPLIT')
      )),

    fetchFinancialData(auth.userId, ninetyDaysAgo, today),
    fetchFinancialData(auth.userId, oneEightyDaysAgo, ninetyDaysAgo),

    fetchFinancialData(auth.userId, month0Start, month0End),
    fetchFinancialData(auth.userId, month1Start, month1End),
    fetchFinancialData(auth.userId, month2Start, month2End),

    fetchTransactionsByCategory(auth.userId, ninetyDaysAgo, today),
    fetchTransactionsByPayee(auth.userId, ninetyDaysAgo, today),

    db.select({
      accountId: creditCardStatements.accountId,
      statementBalance: creditCardStatements.statementBalance,
      paymentDueAmount: creditCardStatements.paymentDueAmount,
      paidAmount: creditCardStatements.paidAmount,
      dueDate: creditCardStatements.dueDate
    })
      .from(creditCardStatements)
      .where(and(
        eq(creditCardStatements.userId, auth.userId),
        eq(creditCardStatements.isPaid, false)
      ))
      .orderBy(desc(creditCardStatements.dueDate)),

    db.select({
      accountId: creditCardStatements.accountId,
      statementBalance: creditCardStatements.statementBalance,
      paidAmount: creditCardStatements.paidAmount,
      paidAt: creditCardStatements.paidAt
    })
      .from(creditCardStatements)
      .where(and(
        eq(creditCardStatements.userId, auth.userId),
        eq(creditCardStatements.isPaid, true)
      ))
      .orderBy(desc(creditCardStatements.paidAt))
      .limit(6),

    db.select({
      name: recurringPayments.name,
      amount: recurringPayments.amount,
      cadence: recurringPayments.cadence,
      intervalMonths: recurringPayments.intervalMonths,
      lastCompletedAt: recurringPayments.lastCompletedAt,
      notes: recurringPayments.notes
    })
      .from(recurringPayments)
      .where(and(
        eq(recurringPayments.userId, auth.userId),
        eq(recurringPayments.isActive, true)
      )),

    db.select({
      id: assets.id,
      name: assets.name,
      type: assets.type,
      quantity: assets.quantity,
      unit: assets.unit,
      totalPaid: assets.totalPaid
    })
      .from(assets)
      .where(and(
        eq(assets.userId, auth.userId),
        eq(assets.isSold, false)
      )),

    db.select({
      type: assetPrices.type,
      symbol: assetPrices.symbol,
      price: assetPrices.price,
      fetchedAt: assetPrices.fetchedAt
    }).from(assetPrices),

    // Transactions with notes from last 90 days, largest first
    db.select({
      payee: transactions.payee,
      amount: transactions.amount,
      date: transactions.date,
      notes: transactions.notes,
      category: categories.name
    })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(accounts.userId, auth.userId),
        eq(accounts.currency, 'NPR'),
        isNotNull(transactions.notes),
        gte(transactions.date, ninetyDaysAgo),
        lte(transactions.date, today)
      ))
      .orderBy(desc(sql`ABS(${transactions.amount})`))
      .limit(20)
  ]);

  // Latest price per asset key
  const latestPriceByKey: Record<string, number> = {};
  for (const p of allPrices) {
    const key = p.type === 'STOCK' && p.symbol ? `${p.type}:${p.symbol}` : p.type;
    if (!(key in latestPriceByKey)) latestPriceByKey[key] = p.price;
  }

  // Account balances
  const accountsWithBalance = await Promise.all(
    allAccounts.map(async acc => {
      const [{ balance }] = await fetchAccountBalance(auth.userId, today, acc.id, true);
      return { ...acc, balance: balance ?? 0 };
    })
  );

  const accountNameMap = new Map(accountsWithBalance.map(a => [a.id, a.name]));

  // CC payment behavior from history
  const paidInFull = recentPaidStatements.filter(s => s.paidAmount >= s.statementBalance).length;
  const ccPaymentNote = recentPaidStatements.length > 0
    ? `User has paid ${paidInFull} of their last ${recentPaidStatements.length} credit card statements in full.`
    : null;

  // Recurring split
  const recurringIncome = activeRecurring.filter(r => r.amount > 0);
  const recurringExpenses = activeRecurring.filter(r => r.amount <= 0);

  // Asset market values
  const assetsWithMarket = unsoldAssets.map(a => {
    const priceKey = a.type === 'STOCK' ? `STOCK:${a.name}` : a.type;
    const livePrice = latestPriceByKey[priceKey];
    const marketValue = livePrice ? a.quantity * (livePrice / 1000) * 1000 : null;
    const pnl = marketValue != null ? marketValue - a.totalPaid : null;
    return { ...a, marketValue, pnl };
  });

  // Asset allocation by type
  const allocationByType: Record<string, { cost: number; market: number }> = {};
  for (const a of assetsWithMarket) {
    if (!allocationByType[a.type]) allocationByType[a.type] = { cost: 0, market: 0 };
    allocationByType[a.type].cost += a.totalPaid;
    allocationByType[a.type].market += a.marketValue ?? a.totalPaid;
  }
  const totalAssetMarket = Object.values(allocationByType).reduce((s, v) => s + v.market, 0);

  // Net worth
  const cashBankAccounts = accountsWithBalance.filter(a => ['CASH', 'BANK', 'OTHER'].includes(a.accountType));
  const ccAccounts = accountsWithBalance.filter(a => a.accountType === 'CREDIT_CARD');
  const loanAccounts = accountsWithBalance.filter(a => a.accountType === 'LOAN');

  const liquidBalance = cashBankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLoanBalance = loanAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalCCBalance = ccAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = liquidBalance + totalAssetMarket - totalLoanBalance - totalCCBalance;

  // Savings metrics
  const income90 = current90?.income ?? 0;
  const expenses90 = Math.abs(current90?.expenses ?? 0);
  const net90 = income90 - expenses90;
  const savingsRate = income90 > 0 ? Math.round((net90 / income90) * 100) : 0;

  // Spending trend (current 90 vs prior 90)
  const priorExpenses90 = Math.abs(prior90?.expenses ?? 0);
  const priorIncome90 = prior90?.income ?? 0;
  const spendingChange = priorExpenses90 > 0
    ? Math.round(((expenses90 - priorExpenses90) / priorExpenses90) * 100)
    : 0;
  const incomeChange = priorIncome90 > 0
    ? Math.round(((income90 - priorIncome90) / priorIncome90) * 100)
    : 0;

  // ── Build context ──────────────────────────────────────────────────────────
  const lines: string[] = [`Financial Snapshot — ${format(now, 'dd MMM yyyy')}`];

  // Net worth summary
  lines.push('\n## Net Worth Summary');
  lines.push(`- Liquid Assets (cash/bank): ${toNPR(liquidBalance)}`);
  lines.push(`- Investment Assets (market value): ${toNPR(totalAssetMarket)}`);
  lines.push(`- Total Liabilities (loans + CC balance): ${toNPR(totalLoanBalance + totalCCBalance)}`);
  lines.push(`- **Net Worth: ${toNPR(netWorth)}**`);

  // Cash & bank
  if (cashBankAccounts.length > 0) {
    lines.push('\n## Cash & Bank Accounts');
    for (const a of cashBankAccounts) {
      lines.push(`- ${a.name} (${a.accountType}): ${toNPR(a.balance)}`);
    }
  }

  // Credit cards
  if (ccAccounts.length > 0) {
    lines.push('\n## Credit Cards');
    for (const a of ccAccounts) {
      const utilization = a.creditLimit && a.creditLimit > 0
        ? Math.round((Math.abs(a.balance) / a.creditLimit) * 100)
        : null;
      lines.push(
        `- ${a.name}: Balance ${toNPR(Math.abs(a.balance))}, Limit ${toNPR(a.creditLimit)}, Utilization ${utilization ?? 'N/A'}%${a.apr ? `, APR ${a.apr}%` : ''}${a.paymentDueDay ? `, due day ${a.paymentDueDay}` : ''}`
      );
    }
    if (ccPaymentNote) lines.push(`Payment history: ${ccPaymentNote}`);

    const overdueStatements = unpaidStatements.filter(s => new Date(s.dueDate) < now);
    const currentCycleStatements = unpaidStatements.filter(s => new Date(s.dueDate) >= now);

    if (overdueStatements.length > 0) {
      lines.push('OVERDUE unpaid statements (due date already passed — urgent):');
      for (const s of overdueStatements) {
        const remaining = s.paymentDueAmount - s.paidAmount;
        const cardName = accountNameMap.get(s.accountId) ?? 'Unknown card';
        const daysOverdue = Math.floor((now.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        lines.push(`  - ${cardName}: ${toNPR(remaining)} was due ${format(new Date(s.dueDate), 'dd MMM yyyy')} (${daysOverdue} days overdue)`);
      }
    }

    if (currentCycleStatements.length > 0) {
      lines.push('Current cycle statements (not yet due — normal):');
      for (const s of currentCycleStatements) {
        const remaining = s.paymentDueAmount - s.paidAmount;
        const cardName = accountNameMap.get(s.accountId) ?? 'Unknown card';
        lines.push(`  - ${cardName}: ${toNPR(remaining)} due ${format(new Date(s.dueDate), 'dd MMM yyyy')}`);
      }
    }
  }

  // Loans
  if (loanAccounts.length > 0) {
    lines.push('\n## Loans');
    for (const a of loanAccounts) {
      lines.push(
        `- ${a.name} (${a.loanSubType ?? 'PEER'}): Remaining ${toNPR(Math.abs(a.balance))}${a.apr ? `, APR ${a.apr}%` : ', 0% interest'}`
      );
    }
  }

  // Cash flow
  lines.push('\n## Cash Flow — Last 90 Days');
  lines.push(`- Total Income: ${toNPR(income90)}`);
  lines.push(`- Total Expenses: ${toNPR(expenses90)}`);
  lines.push(`- Net Savings: ${toNPR(net90)}`);
  lines.push(`- Savings Rate: ${savingsRate}%`);
  lines.push(`- vs Prior 90 Days: income ${incomeChange >= 0 ? '+' : ''}${incomeChange}%, spending ${spendingChange >= 0 ? '+' : ''}${spendingChange}%`);

  // Monthly breakdown
  lines.push('\n## Monthly Breakdown');
  const months = [
    { label: format(month2Start, 'MMM yyyy'), data: month2Data },
    { label: format(month1Start, 'MMM yyyy'), data: month1Data },
    { label: format(month0Start, 'MMM yyyy'), data: month0Data }
  ];
  for (const m of months) {
    const inc = m.data?.income ?? 0;
    const exp = Math.abs(m.data?.expenses ?? 0);
    const net = inc - exp;
    lines.push(`- ${m.label}: Income ${toNPR(inc)}, Expenses ${toNPR(exp)}, Net ${toNPR(net)}`);
  }

  // Categories
  if (categorySpending.length > 0) {
    lines.push('\n## Top Expense Categories (last 90 days)');
    for (const cat of categorySpending.slice(0, 10)) {
      lines.push(`- ${cat.name}: ${toNPR(cat.value)} (${pct(cat.value, expenses90)} of total spending)`);
    }
  }

  // Payees
  if (topPayees.length > 0) {
    lines.push('\n## Top Payees (last 90 days)');
    for (const p of topPayees.slice(0, 8)) {
      lines.push(`- ${p.name}: ${toNPR(p.value)}`);
    }
  }

  // Recurring income
  if (recurringIncome.length > 0) {
    lines.push('\n## Recurring Income');
    for (const r of recurringIncome) {
      const label = r.cadence === 'MONTHLY'
        ? r.intervalMonths > 1 ? `every ${r.intervalMonths} months` : 'monthly'
        : r.cadence.toLowerCase();
      const noteStr = r.notes ? ` — note: "${r.notes}"` : '';
      lines.push(`- ${r.name}: ${toNPR(r.amount)} ${label}${noteStr}`);
    }
  }

  // Recurring expenses
  if (recurringExpenses.length > 0) {
    lines.push('\n## Recurring Expenses');
    for (const r of recurringExpenses) {
      const label = r.cadence === 'MONTHLY'
        ? r.intervalMonths > 1 ? `every ${r.intervalMonths} months` : 'monthly'
        : r.cadence.toLowerCase();
      const lastDone = r.lastCompletedAt ? format(new Date(r.lastCompletedAt), 'dd MMM yyyy') : 'never';
      const noteStr = r.notes ? ` — note: "${r.notes}"` : '';
      lines.push(`- ${r.name}: ${toNPR(Math.abs(r.amount))} ${label} (last completed: ${lastDone})${noteStr}`);
    }
  }

  // Assets
  if (assetsWithMarket.length > 0) {
    lines.push('\n## Investment Assets');

    if (Object.keys(allocationByType).length > 0) {
      lines.push('Asset allocation by type:');
      for (const [type, val] of Object.entries(allocationByType)) {
        lines.push(`  - ${type}: cost ${toNPR(val.cost)}, market ${toNPR(val.market)} (${pct(val.market, totalAssetMarket)} of portfolio)`);
      }
    }

    lines.push('Individual holdings:');
    for (const a of assetsWithMarket) {
      const pnlStr = a.pnl != null
        ? ` | P&L: ${a.pnl >= 0 ? '+' : ''}${toNPR(a.pnl)} (${a.totalPaid > 0 ? (a.pnl >= 0 ? '+' : '') + Math.round((a.pnl / a.totalPaid) * 100) + '%' : 'N/A'})`
        : '';
      lines.push(`  - ${a.name} (${a.type}): ${a.quantity} ${a.unit}, Cost ${toNPR(a.totalPaid)}${a.marketValue != null ? `, Market ${toNPR(a.marketValue)}` : ''}${pnlStr}`);
    }
  }

  // Annotated transactions (user-written notes on individual transactions)
  if (notedTransactions.length > 0) {
    lines.push('\n## User Notes on Transactions (last 90 days)');
    lines.push('These are notes the user wrote on specific transactions — treat as first-hand context:');
    for (const t of notedTransactions) {
      const sign = t.amount >= 0 ? '+' : '';
      const catStr = t.category ? ` [${t.category}]` : '';
      lines.push(`- ${format(new Date(t.date), 'dd MMM')}: ${t.payee}${catStr} ${sign}${toNPR(t.amount)} — "${t.notes}"`);
    }
  }

  const context = lines.join('\n');

  const prompt = `You are a personal finance advisor for a user in Nepal. Analyze the following financial data and provide actionable, specific recommendations.

Important context for interpretation:
- Credit cards: distinguish carefully between "OVERDUE unpaid statements" and "Current cycle statements". OVERDUE statements (due date already passed) are always high priority regardless of payment history — flag them with the exact amount and days overdue. Current cycle statements are normal monthly spending not yet due — do NOT flag these if the user has a history of paying in full.
- "Recurring Income" entries are inflows (salary, interest, etc.) — do not treat them as expenses or flag them as concerns.
- "Recurring Expenses" entries are outgoing obligations.
- Peer loans (PEER subtype) are informal loans at 0% interest. Always flag any outstanding peer loan balance — even without interest cost, carrying informal debt is a financial risk worth addressing.
- EMI loans have fixed repayment schedules — flag only if the APR is high or the balance is large relative to income.
- Amounts are in Nepalese Rupees (NPR). Nepal context: typical mid-level salaries range NPR 50,000–200,000/month.
- The user manually logs recurring payments — "last completed" being old does not mean they missed a payment.
- Monthly breakdown shows income/spending trends — flag if expenses are increasing month over month or savings rate is declining.
- Savings rate below 20% of income is a concern; below 10% is high priority.

${context}

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "summary": "2-3 sentences giving an honest, specific overview of financial health referencing key numbers",
  "recommendations": [
    {
      "priority": "high",
      "category": "debt",
      "title": "Short actionable title",
      "description": "Specific observation referencing actual numbers from the data",
      "action": "Concrete next step the user can take"
    }
  ]
}

Priority must be "high", "medium", or "low".
Category must be one of: "spending", "debt", "savings", "investments", "cashflow", "general".
Include 5-8 recommendations ordered from highest to lowest priority.
Do not invent concerns not supported by the data. Base every recommendation on specific numbers provided.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return c.json({ error: 'Failed to parse AI response', raw: text }, 500);
  }

  return c.json({ data });
});

export default app;
