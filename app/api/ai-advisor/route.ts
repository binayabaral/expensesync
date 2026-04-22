import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { and, desc, eq, gte, isNotNull, lte, ne, sql, sum } from 'drizzle-orm';
import { subDays, endOfDay, startOfDay, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';

import { db } from '@/db/drizzle';
import { accounts, aiRecommendations, assets, assetPrices, categories, creditCardStatements, recurringPayments, transactions } from '@/db/schema';
import {
  fetchFinancialData,
  fetchTransactionsByCategory,
  fetchTransactionsByPayee
} from '../utils/common';

export const maxDuration = 60;

const RATE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

function isRateLimitBypassed(userId: string): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const list = (process.env.BYPASS_AI_RATE_LIMIT_USERS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(userId);
}

async function getUserTier(userId: string): Promise<'paid' | 'free'> {
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    return user.publicMetadata?.tier === 'paid' ? 'paid' : 'free';
  } catch {
    return 'free';
  }
}

const toNPR = (mili: number | null | undefined) => {
  const val = Math.round((mili ?? 0) / 1000);
  return `NPR ${val.toLocaleString('en-US')}`;
};

const pct = (value: number, total: number) =>
  total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.userId, userId))
    .orderBy(desc(aiRecommendations.createdAt))
    .limit(1);

  if (rows.length === 0) return Response.json({ data: null, meta: null });

  const row = rows[0];
  const nextRefreshAt = new Date(row.createdAt.getTime() + RATE_LIMIT_MS);
  return Response.json({
    data: row.data,
    meta: {
      createdAt: row.createdAt,
      model: row.model,
      tier: row.tier,
      canRefresh: isRateLimitBypassed(userId) || new Date() >= nextRefreshAt,
      nextRefreshAt
    }
  });
}

export async function POST() {
  try {
    return await handleRequest();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error('[ai-advisor] error:', raw);
    const message = raw.includes('503') ? 'AI service temporarily overloaded — please try again in a moment.'
      : raw.includes('429') ? 'AI rate limit reached — please wait a moment and try again.'
      : raw.includes('401') || raw.includes('403') ? 'AI service authentication failed — check the API key.'
      : 'Something went wrong. Please try again.';
    if (process.env.NODE_ENV === 'development') {
      return Response.json({ error: message, raw }, { status: 500 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

async function handleRequest() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit check
  const latest = await db.select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.userId, userId))
    .orderBy(desc(aiRecommendations.createdAt))
    .limit(1);

  if (latest.length > 0 && !isRateLimitBypassed(userId)) {
    const nextRefreshAt = new Date(latest[0].createdAt.getTime() + RATE_LIMIT_MS);
    if (new Date() < nextRefreshAt) {
      return Response.json({ error: 'rate_limited', nextRefreshAt }, { status: 429 });
    }
  }

  const tier = await getUserTier(userId);

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
    allBalances,
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
      description: accounts.description,
      accountType: accounts.accountType,
      creditLimit: accounts.creditLimit,
      apr: accounts.apr,
      loanSubType: accounts.loanSubType,
      paymentDueDay: accounts.paymentDueDay,
      currency: accounts.currency,
      isClosed: accounts.isClosed
    })
      .from(accounts)
      .where(and(
        eq(accounts.userId, userId),
        eq(accounts.isDeleted, false),
        ne(accounts.accountType, 'BILL_SPLIT')
      )),

    // Single batched balance query replacing the per-account loop
    db.select({
      accountId: transactions.accountId,
      balance: sum(transactions.amount).mapWith(Number)
    })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(
        eq(accounts.userId, userId),
        lte(transactions.date, today)
      ))
      .groupBy(transactions.accountId),

    fetchFinancialData(userId, ninetyDaysAgo, today),
    fetchFinancialData(userId, oneEightyDaysAgo, ninetyDaysAgo),

    fetchFinancialData(userId, month0Start, month0End),
    fetchFinancialData(userId, month1Start, month1End),
    fetchFinancialData(userId, month2Start, month2End),

    fetchTransactionsByCategory(userId, ninetyDaysAgo, today),
    fetchTransactionsByPayee(userId, ninetyDaysAgo, today),

    db.select({
      accountId: creditCardStatements.accountId,
      statementBalance: creditCardStatements.statementBalance,
      paymentDueAmount: creditCardStatements.paymentDueAmount,
      paidAmount: creditCardStatements.paidAmount,
      dueDate: creditCardStatements.dueDate
    })
      .from(creditCardStatements)
      .where(and(
        eq(creditCardStatements.userId, userId),
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
        eq(creditCardStatements.userId, userId),
        eq(creditCardStatements.isPaid, true)
      ))
      .orderBy(desc(creditCardStatements.paidAt))
      .limit(6),

    db.select({
      name: recurringPayments.name,
      amount: recurringPayments.amount,
      transferCharge: recurringPayments.transferCharge,
      cadence: recurringPayments.cadence,
      intervalMonths: recurringPayments.intervalMonths,
      dayOfMonth: recurringPayments.dayOfMonth,
      month: recurringPayments.month,
      startDate: recurringPayments.startDate,
      lastCompletedAt: recurringPayments.lastCompletedAt,
      notes: recurringPayments.notes,
      accountId: recurringPayments.accountId,
      toAccountId: recurringPayments.toAccountId
    })
      .from(recurringPayments)
      .where(and(
        eq(recurringPayments.userId, userId),
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
        eq(assets.userId, userId),
        eq(assets.isSold, false)
      )),

    db.select({
      type: assetPrices.type,
      symbol: assetPrices.symbol,
      price: assetPrices.price,
      fetchedAt: assetPrices.fetchedAt
    }).from(assetPrices),

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
        eq(accounts.userId, userId),
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

  // Merge accounts with their batched balances
  const balanceByAccountId = new Map(allBalances.map(r => [r.accountId, r.balance ?? 0]));
  const accountsWithBalance = allAccounts.map(acc => ({
    ...acc,
    balance: balanceByAccountId.get(acc.id) ?? 0
  }));

  const accountNameMap = new Map(accountsWithBalance.map(a => [a.id, a.name]));

  // CC payment behavior
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

  // Spending trend
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

  lines.push('\n## Net Worth Summary');
  lines.push(`- Liquid Assets (cash/bank): ${toNPR(liquidBalance)}`);
  lines.push(`- Investment Assets (market value): ${toNPR(totalAssetMarket)}`);
  lines.push(`- Total Liabilities (loans + CC balance): ${toNPR(totalLoanBalance + totalCCBalance)}`);
  lines.push(`- Net Worth: ${toNPR(netWorth)}`);
  const netWorthTrend = net90 > 0 ? 'improving (net positive savings last 90 days)'
    : net90 < 0 ? 'declining (net negative savings last 90 days)'
    : 'flat';
  lines.push(`- Net Worth Trend: ${netWorthTrend}`);

  if (cashBankAccounts.length > 0) {
    lines.push('\n## Cash & Bank Accounts');
    for (const a of cashBankAccounts) {
      const descStr = a.description ? ` — "${a.description}"` : '';
      lines.push(`- ${a.name} (${a.accountType}): ${toNPR(a.balance)}${a.isClosed ? ' [CLOSED]' : ''}${descStr}`);
    }
  }

  if (ccAccounts.length > 0) {
    lines.push('\n## Credit Cards');
    for (const a of ccAccounts) {
      const utilization = a.creditLimit && a.creditLimit > 0
        ? Math.round((Math.abs(a.balance) / a.creditLimit) * 100)
        : null;
      const descStr = a.description ? ` — "${a.description}"` : '';
      lines.push(
        `- ${a.name}${a.isClosed ? ' [CLOSED]' : ''}: Balance ${toNPR(Math.abs(a.balance))}, Limit ${toNPR(a.creditLimit)}, Utilization ${utilization ?? 'N/A'}%${a.apr ? `, APR ${a.apr}%` : ''}${a.paymentDueDay ? `, due day ${a.paymentDueDay}` : ''}${descStr}`
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

  if (loanAccounts.length > 0) {
    lines.push('\n## Loans');
    for (const a of loanAccounts) {
      const descStr = a.description ? ` — "${a.description}"` : '';
      lines.push(
        `- ${a.name}${a.isClosed ? ' [CLOSED]' : ''} (${a.loanSubType ?? 'PEER'}): Remaining ${toNPR(Math.abs(a.balance))}${a.apr ? `, APR ${a.apr}%` : ', 0% interest'}${descStr}`
      );
      if ((a.loanSubType === 'PEER' || !a.loanSubType) && !a.isClosed && Math.abs(a.balance) > 0) {
        lines.push(`  (Informal peer loan at 0% interest — no penalty for gradual repayment)`);
      }
    }
  }

  lines.push('\n## Cash Flow — Last 90 Days');
  lines.push(`- Total Income: ${toNPR(income90)}`);
  lines.push(`- Total Expenses: ${toNPR(expenses90)}`);
  lines.push(`- Net Savings: ${toNPR(net90)}`);
  lines.push(`- Savings Rate: ${savingsRate}%`);
  lines.push(`- vs Prior 90 Days: income ${incomeChange >= 0 ? '+' : ''}${incomeChange}%, spending ${spendingChange >= 0 ? '+' : ''}${spendingChange}%`);

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

  if (categorySpending.length > 0) {
    lines.push('\n## Top Expense Categories (last 90 days)');
    for (const cat of categorySpending.slice(0, 10)) {
      lines.push(`- ${cat.name}: ${toNPR(cat.value)} (${pct(cat.value, expenses90)} of total spending)`);
    }
    const oneTimeKeywords = ['marriage', 'wedding', 'celebration', 'ceremony'];
    const oneTimeCats = categorySpending.filter(c =>
      oneTimeKeywords.some(kw => c.name.toLowerCase().includes(kw))
    );
    if (oneTimeCats.length > 0) {
      lines.push(`Note: Spending includes one-time event categories (${oneTimeCats.map(c => c.name).join(', ')}) — these are not recurring lifestyle costs.`);
    }
  }

  if (topPayees.length > 0) {
    lines.push('\n## Top Payees (last 90 days)');
    for (const p of topPayees.slice(0, 8)) {
      lines.push(`- ${p.name}: ${toNPR(p.value)}`);
    }
  }

  if (recurringIncome.length > 0) {
    lines.push('\n## Recurring Income');
    for (const r of recurringIncome) {
      const label = r.cadence === 'MONTHLY'
        ? r.intervalMonths > 1 ? `every ${r.intervalMonths} months` : 'monthly'
        : r.cadence.toLowerCase();
      const toAccName = r.toAccountId ? accountNameMap.get(r.toAccountId) : null;
      const accountStr = toAccName ? ` → into "${toAccName}"` : '';
      const dueDayStr = r.dayOfMonth ? ` on day ${r.dayOfMonth}` : '';
      const noteStr = r.notes ? ` — note: "${r.notes}"` : '';
      lines.push(`- ${r.name}: ${toNPR(r.amount)} ${label}${dueDayStr}${accountStr}${noteStr}`);
    }
  }

  if (recurringExpenses.length > 0) {
    lines.push('\n## Recurring Expenses');
    for (const r of recurringExpenses) {
      const label = r.cadence === 'MONTHLY'
        ? r.intervalMonths > 1 ? `every ${r.intervalMonths} months` : 'monthly'
        : r.cadence.toLowerCase();
      const lastDone = r.lastCompletedAt ? format(new Date(r.lastCompletedAt), 'dd MMM yyyy') : 'never';
      const fromAccName = r.accountId ? accountNameMap.get(r.accountId) : null;
      const toAccName = r.toAccountId ? accountNameMap.get(r.toAccountId) : null;
      const accountStr = fromAccName && toAccName
        ? ` from "${fromAccName}" → "${toAccName}"`
        : fromAccName ? ` from "${fromAccName}"` : toAccName ? ` → "${toAccName}"` : '';
      const dueDayStr = r.dayOfMonth ? ` on day ${r.dayOfMonth}` : '';
      const chargeStr = r.transferCharge && r.transferCharge > 0 ? ` + ${toNPR(r.transferCharge)} charges/interest` : '';
      const noteStr = r.notes ? ` — note: "${r.notes}"` : '';
      lines.push(`- ${r.name}: ${toNPR(Math.abs(r.amount))}${chargeStr} ${label}${dueDayStr}${accountStr} (last completed: ${lastDone})${noteStr}`);
      if (r.transferCharge && r.transferCharge > 0) {
        const total = Math.abs(r.amount) + r.transferCharge;
        lines.push(`  → Total monthly deduction: ${toNPR(total)} (principal ${toNPR(Math.abs(r.amount))} + charges/interest ${toNPR(r.transferCharge)})`);
      }
    }
  }

  const getNextAnnualDue = (r: {
    lastCompletedAt: Date | null;
    startDate: Date | null;
    dayOfMonth: number | null;
    month: number | null;
  }): Date | null => {
    if (r.month && r.dayOfMonth) {
      const monthIndex = r.month - 1;
      const currentYear = now.getFullYear();
      const thisYear = new Date(currentYear, monthIndex, r.dayOfMonth);
      if (thisYear > now) return thisYear;
      return new Date(currentYear + 1, monthIndex, r.dayOfMonth);
    }
    if (r.lastCompletedAt) {
      const next = new Date(r.lastCompletedAt);
      next.setFullYear(next.getFullYear() + 1);
      while (next <= now) next.setFullYear(next.getFullYear() + 1);
      return next;
    }
    if (r.startDate) {
      const next = new Date(r.startDate);
      while (next <= now) next.setFullYear(next.getFullYear() + 1);
      return next;
    }
    return null;
  };

  const upcomingAnnual = activeRecurring.filter(r => {
    if (r.cadence !== 'YEARLY') return false;
    const nextDue = getNextAnnualDue(r);
    if (!nextDue) return false;
    const daysUntilDue = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue >= 0 && daysUntilDue <= 90;
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[annual debug] all yearly recurring:', activeRecurring
      .filter(r => r.cadence === 'YEARLY')
      .map(r => ({
        name: r.name,
        amount: r.amount,
        inRecurringExpenses: recurringExpenses.some(e => e.name === r.name),
        lastCompletedAt: r.lastCompletedAt,
        startDate: r.startDate,
        nextDue: getNextAnnualDue(r)?.toISOString()
      }))
    );
    console.log('[upcoming annual] filtered list:', upcomingAnnual.map(r => ({
      name: r.name,
      nextDue: getNextAnnualDue(r)?.toISOString()
    })));
  }

  if (upcomingAnnual.length > 0) {
    lines.push('\n## Upcoming Annual Expenses (due within 90 days — dates pre-calculated from schedule)');
    lines.push('IMPORTANT: Use ONLY these exact dates. Do not calculate or invent due dates from other data.');
    for (const r of upcomingAnnual) {
      const nextDue = getNextAnnualDue(r);
      const totalAmount = Math.abs(r.amount) + (r.transferCharge ?? 0);
      lines.push(`- ${r.name}: ${toNPR(totalAmount)} due ${nextDue ? format(nextDue, 'dd MMM yyyy') : 'soon'}`);
    }
  } else {
    lines.push('\n## Upcoming Annual Expenses (due within 90 days)');
    lines.push('No annual expenses due within the next 90 days.');
  }

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

  const systemPrompt = `You are a personal finance advisor for a user in Nepal. Analyze the financial data provided and give actionable, specific recommendations.

## Nepal Context
- Currency is NPR. Salary ranges: entry-level NPR 30,000–80,000/month, mid-level NPR 80,000–200,000/month, senior/foreign-employed NPR 200,000–500,000/month. Adjust recommendations proportionally to the user's actual income.
- NEPSE is Nepal's stock exchange. SIP refers to Systematic Investment Plan in Nepal-based mutual funds, not foreign markets.
- SSF (Social Security Fund) is Nepal's mandatory government social security scheme. SSF Pension is locked until age 60. SSF Retirement is accessible on employer change. SSF contributions are mandatory obligations similar to tax — never treat them as discretionary or concerning expenses.
- Gold and silver assets in Nepal often serve dual purpose as cultural/personal use AND store of value. Do not recommend selling gold or silver unless the user is in a genuine liquidity crisis.
- eSewa and Khalti are Nepal's leading digital wallets — low balances in these are normal and intentional.

## Credit Card Rules
- The CC account balance shown is the running unbilled balance — normal monthly spending, NOT carried debt. Do NOT flag it as debt unless there is an overdue unpaid statement.
- OVERDUE statements (due date already passed) are always high priority — flag with exact amount and days overdue.
- Current cycle unpaid statements (due date not yet passed) are normal — do NOT flag if the user has a history of paying in full.
- If payment history shows the user consistently pays in full, never recommend "paying off the credit card balance."

## Account Rules
- Accounts marked [CLOSED] are inactive — ignore their balances, do not flag them.
- Accounts with a description (shown after —): read the description carefully to understand purpose before making recommendations. Do not recommend closing an account that has a stated purpose (e.g. EMI auto-deduction account, salary landing account).
- "Recurring Income" entries are inflows — never treat as expenses or concerns.
- "Recurring Expenses" entries are planned obligations.
- Insurance premium payments (life, car) and vehicle registration fees are planned obligations — do not flag as concerning expenses. Only flag if total fixed obligations exceed 40% of monthly income.
- Car EMI shown may be principal only — do not make precise EMI calculations unless total is explicitly stated.
- The user manually logs recurring payments — "last completed" being old does not mean a missed payment.
- CASH type accounts and digital wallets (eSewa, Khalti, and similar mobile wallets) should never be flagged for closure or review based on low balance alone — low balances are normal and intentional for wallets.
- Dedicated-purpose accounts (EV charging wallet, travel card, broker/TMS account) must never be flagged if their description states a specific use case, regardless of current balance.
- A stock trading or broker account (e.g. NAASA TMS) must never be flagged for closure if the user holds any active stock positions.
- If a bank account belongs to the same institution as an active credit card (e.g. HBL bank account + HBL credit card), do not recommend closing the bank account — it is almost certainly used for credit card payments.

## Loan Rules
- Peer loans (PEER, 0% interest): flag for awareness but do not treat as more urgent than interest-bearing EMI debt. Note the 0% nature explicitly.
- EMI loans: flag only if APR is high or balance is large relative to income.

## One-Time Events
- If spending includes categories flagged as one-time events (marriage, wedding, etc.), do not use that period's expenses to calculate ongoing burn rate or savings rate. Acknowledge as context only.

## Savings & Emergency Fund
- Savings rate below 20% is a concern; below 10% is high priority.
- When referencing a savings target percentage in recommendations, derive it from the actual savings rate in the data: round the actual rate to the nearest 5% (e.g. 27% → 25%, 28% → 30%) and use that figure consistently. Never assume 25% if the actual rate differs.
- If the user does not appear to have 3–6 months of expenses in a dedicated liquid account, flag this as a high-priority concern.
- Prefer keeping idle money in the highest-interest account. Do not suggest moving from a high-interest savings account to a low-interest spending account unnecessarily.

## Health Insurance
- If no health insurance account or health insurance recurring expense is visible in the data, flag this as a medium-priority recommendation regardless of other financial health.

## Monthly Trends
- Flag if expenses are increasing month over month or savings rate is declining.

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

  const vertexApiKey = process.env.VERTEX_AI_API_KEY;
  const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  const useVertexAI = tier === 'paid' && !!vertexApiKey;

  if (!useVertexAI && !geminiApiKey) {
    return Response.json({ error: 'AI service not configured' }, { status: 500 });
  }

  const endpoint = useVertexAI
    ? `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${vertexApiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: context }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        temperature: 0.2
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI ${res.status}: ${errText}`);
  }

  const aiResponse = await res.json();
  const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return Response.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 });
  }

  const modelUsed = useVertexAI ? 'gemini-2.5-flash (vertex)' : 'gemini-2.5-flash';
  await db.insert(aiRecommendations).values({
    id: createId(),
    userId,
    data,
    model: modelUsed,
    tier
  });

  const nextRefreshAt = new Date(Date.now() + RATE_LIMIT_MS);
  return Response.json({
    data,
    meta: {
      createdAt: new Date(),
      model: modelUsed,
      tier,
      canRefresh: isRateLimitBypassed(userId),
      nextRefreshAt
    }
  });
}
