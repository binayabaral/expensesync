import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { and, desc, eq, gte, isNotNull, lte, ne, sql, sum } from 'drizzle-orm';
import { subDays, endOfDay, startOfDay, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';

import { db } from '@/db/drizzle';
import { accounts, aiOrganizationReports, assets, assetPrices, categories, creditCardStatements, recurringPayments, transactions } from '@/db/schema';
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

const formatCurrency = (mili: number | null | undefined, currency: string = 'NPR') => {
  const val = Math.round((mili ?? 0) / 1000);
  return `${currency} ${val.toLocaleString('en-US')}`;
};
const toNPR = (mili: number | null | undefined) => formatCurrency(mili, 'NPR');

const pct = (value: number, total: number) =>
  total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.select()
    .from(aiOrganizationReports)
    .where(eq(aiOrganizationReports.userId, userId))
    .orderBy(desc(aiOrganizationReports.createdAt))
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
    console.error('[ai-organization] error:', raw);
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

  const latest = await db.select()
    .from(aiOrganizationReports)
    .where(eq(aiOrganizationReports.userId, userId))
    .orderBy(desc(aiOrganizationReports.createdAt))
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
    notedTransactions,
    categoryMonth0,
    categoryMonth1,
    categoryMonth2
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
      .limit(20),

    fetchTransactionsByCategory(userId, month0Start, month0End),
    fetchTransactionsByCategory(userId, month1Start, month1End),
    fetchTransactionsByCategory(userId, month2Start, month2End)
  ]);

  const latestPriceByKey: Record<string, number> = {};
  for (const p of allPrices) {
    const key = p.type === 'STOCK' && p.symbol ? `${p.type}:${p.symbol}` : p.type;
    if (!(key in latestPriceByKey)) latestPriceByKey[key] = p.price;
  }

  const balanceByAccountId = new Map(allBalances.map(r => [r.accountId, r.balance ?? 0]));
  const accountsWithBalance = allAccounts.map(acc => ({
    ...acc,
    balance: balanceByAccountId.get(acc.id) ?? 0
  }));

  const accountNameMap = new Map(accountsWithBalance.map(a => [a.id, a.name]));

  const primaryCurrency = accountsWithBalance.find(
    a => a.accountType === 'BANK' && !a.isClosed && a.currency
  )?.currency ?? 'NPR';

  const paidInFull = recentPaidStatements.filter(s => s.paidAmount >= s.statementBalance).length;
  const ccPaymentNote = recentPaidStatements.length > 0
    ? `User has paid ${paidInFull} of their last ${recentPaidStatements.length} credit card statements in full.`
    : null;

  const recurringIncome = activeRecurring.filter(r => r.amount > 0);
  const recurringExpenses = activeRecurring.filter(r => r.amount <= 0);

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

  const assetsWithMarket = unsoldAssets.map(a => {
    const priceKey = a.type === 'STOCK' ? `STOCK:${a.name}` : a.type;
    const livePrice = latestPriceByKey[priceKey];
    const marketValue = livePrice ? a.quantity * (livePrice / 1000) * 1000 : null;
    const pnl = marketValue != null ? marketValue - a.totalPaid : null;
    return { ...a, marketValue, pnl };
  });

  const allocationByType: Record<string, { cost: number; market: number }> = {};
  for (const a of assetsWithMarket) {
    if (!allocationByType[a.type]) allocationByType[a.type] = { cost: 0, market: 0 };
    allocationByType[a.type].cost += a.totalPaid;
    allocationByType[a.type].market += a.marketValue ?? a.totalPaid;
  }
  const totalAssetMarket = Object.values(allocationByType).reduce((s, v) => s + v.market, 0);

  const cashBankAccounts = accountsWithBalance.filter(a => ['CASH', 'BANK', 'OTHER'].includes(a.accountType));
  const ccAccounts = accountsWithBalance.filter(a => a.accountType === 'CREDIT_CARD');
  const loanAccounts = accountsWithBalance.filter(a => a.accountType === 'LOAN');

  const liquidBalance = cashBankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLoanBalance = loanAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalCCBalance = ccAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = liquidBalance + totalAssetMarket - totalLoanBalance - totalCCBalance;

  const income90 = current90?.income ?? 0;
  const expenses90 = Math.abs(current90?.expenses ?? 0);
  const net90 = income90 - expenses90;
  const savingsRate = income90 > 0 ? Math.round((net90 / income90) * 100) : 0;

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
  const netWorthTrend = net90 > 0 ? 'improving' : net90 < 0 ? 'declining' : 'flat';
  lines.push(`- Net Worth Trend: ${netWorthTrend} (net ${net90 >= 0 ? '+' : ''}${toNPR(net90)} last 90 days)`);

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
      lines.push('OVERDUE unpaid statements:');
      for (const s of overdueStatements) {
        const remaining = s.paymentDueAmount - s.paidAmount;
        const cardName = accountNameMap.get(s.accountId) ?? 'Unknown card';
        const daysOverdue = Math.floor((now.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        lines.push(`  - ${cardName}: ${toNPR(remaining)} was due ${format(new Date(s.dueDate), 'dd MMM yyyy')} (${daysOverdue} days overdue)`);
      }
    }
    if (currentCycleStatements.length > 0) {
      lines.push('Current cycle statements (not yet due):');
      for (const s of currentCycleStatements) {
        const cardName = accountNameMap.get(s.accountId) ?? 'Unknown card';
        lines.push(`  - ${cardName}: ${toNPR(s.paymentDueAmount - s.paidAmount)} due ${format(new Date(s.dueDate), 'dd MMM yyyy')}`);
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
    }
  }

  lines.push('\n## Cash Flow — Last 90 Days');
  lines.push(`- Total Income: ${toNPR(income90)}`);
  lines.push(`- Total Expenses: ${toNPR(expenses90)}`);
  lines.push(`- Net: ${toNPR(net90)}`);
  lines.push(`- Savings Rate: ${savingsRate}%`);
  lines.push(`- vs Prior 90 Days: income ${incomeChange >= 0 ? '+' : ''}${incomeChange}%, spending ${spendingChange >= 0 ? '+' : ''}${spendingChange}%`);

  lines.push('\n## Monthly Breakdown');
  for (const m of [
    { label: format(month2Start, 'MMM yyyy'), data: month2Data },
    { label: format(month1Start, 'MMM yyyy'), data: month1Data },
    { label: format(month0Start, 'MMM yyyy'), data: month0Data }
  ]) {
    const inc = m.data?.income ?? 0;
    const exp = Math.abs(m.data?.expenses ?? 0);
    lines.push(`- ${m.label}: Income ${toNPR(inc)}, Expenses ${toNPR(exp)}, Net ${toNPR(inc - exp)}`);
  }

  if (categorySpending.length > 0) {
    lines.push('\n## Top Expense Categories (last 90 days)');
    for (const cat of categorySpending.slice(0, 10)) {
      lines.push(`- ${cat.name}: ${toNPR(cat.value)} (${pct(cat.value, expenses90)} of total)`);
    }
    const oneTimeKeywords = ['marriage', 'wedding', 'celebration', 'ceremony', 'funeral', 'renovation', 'engagement'];
    const oneTimeCats = categorySpending.filter(c =>
      oneTimeKeywords.some(kw => c.name.toLowerCase().includes(kw))
    );
    if (oneTimeCats.length > 0) {
      lines.push(`Note: includes one-time event categories (${oneTimeCats.map(c => c.name).join(', ')}) — exclude from recurring budget.`);
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
      const label = r.cadence === 'YEARLY'
        ? '[YEARLY]'
        : r.cadence === 'MONTHLY'
          ? r.intervalMonths >= 12 ? '[YEARLY]'
          : r.intervalMonths >= 3 ? `[QUARTERLY — every ${r.intervalMonths} months]`
          : r.intervalMonths > 1 ? `[every ${r.intervalMonths} months]`
          : '[MONTHLY]'
        : `[${r.cadence}]`;
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
      const label = r.cadence === 'YEARLY'
        ? '[YEARLY]'
        : r.cadence === 'MONTHLY'
          ? r.intervalMonths >= 12 ? '[YEARLY]'
          : r.intervalMonths >= 3 ? `[QUARTERLY — every ${r.intervalMonths} months]`
          : r.intervalMonths > 1 ? `[every ${r.intervalMonths} months]`
          : '[MONTHLY]'
        : `[${r.cadence}]`;
      const lastDone = r.lastCompletedAt ? format(new Date(r.lastCompletedAt), 'dd MMM yyyy') : 'never';
      const fromAccName = r.accountId ? accountNameMap.get(r.accountId) : null;
      const toAccName = r.toAccountId ? accountNameMap.get(r.toAccountId) : null;
      const accountStr = fromAccName && toAccName
        ? ` from "${fromAccName}" → "${toAccName}"`
        : fromAccName ? ` from "${fromAccName}"` : toAccName ? ` → "${toAccName}"` : '';
      const dueDayStr = r.dayOfMonth ? ` on day ${r.dayOfMonth}` : '';
      const chargeStr = r.transferCharge && r.transferCharge > 0 ? ` + ${toNPR(r.transferCharge)} interest` : '';
      const noteStr = r.notes ? ` — note: "${r.notes}"` : '';
      lines.push(`- ${r.name}: ${toNPR(Math.abs(r.amount))}${chargeStr} ${label}${dueDayStr}${accountStr} (last completed: ${lastDone})${noteStr}`);
      if (r.transferCharge && r.transferCharge > 0) {
        const total = Math.abs(r.amount) + r.transferCharge;
        lines.push(`  → Total monthly deduction: ${toNPR(total)} (principal ${toNPR(Math.abs(r.amount))} + interest ${toNPR(r.transferCharge)})`);
      }
      if (r.cadence === 'YEARLY' || (r.cadence === 'MONTHLY' && r.intervalMonths >= 12)) {
        lines.push(`  ⚠ YEARLY expense — do NOT use dayOfMonth/month fields to calculate due date. Use ONLY the pre-calculated date from "Upcoming Annual Expenses" section.`);
      }
    }
  }

  const oneTimeKeywords = ['marriage', 'wedding', 'celebration', 'ceremony', 'funeral', 'renovation', 'engagement'];
  const isOneTime = (name: string) => oneTimeKeywords.some(kw => name.toLowerCase().includes(kw));

  // Per-month category trend context
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const currentMonthScaleFactor = daysInCurrentMonth / daysElapsed;

  const categoryMonth0Scaled = categoryMonth0.map(c => ({
    ...c,
    value: Math.round(c.value * currentMonthScaleFactor)
  }));

  const allCategoryNames = [...new Set([
    ...categoryMonth0.map(c => c.name),
    ...categoryMonth1.map(c => c.name),
    ...categoryMonth2.map(c => c.name)
  ])].filter(name => !isOneTime(name));

  if (allCategoryNames.length > 0) {
    const m2Label = format(month2Start, 'MMM');
    const m1Label = format(month1Start, 'MMM');
    const m0Label = format(month0Start, 'MMM');
    lines.push(`\n## Category Spending by Month (${m2Label} → ${m1Label} → ${m0Label}, one-time events excluded)`);
    lines.push(`Use these figures to set accurate budget status. Columns: oldest | middle | current (scaled ×${currentMonthScaleFactor.toFixed(2)} for ${daysElapsed}/${daysInCurrentMonth} days) | avg/mo | trend`);
    lines.push(`IMPORTANT: Current month figures are estimates scaled from ${daysElapsed} days of data. If a category shows an unusually large drop vs average, it may be incomplete data rather than a real reduction.`);
    for (const name of allCategoryNames) {
      const m2 = categoryMonth2.find(c => c.name === name)?.value ?? 0;
      const m1 = categoryMonth1.find(c => c.name === name)?.value ?? 0;
      const m0 = categoryMonth0Scaled.find(c => c.name === name)?.value ?? 0;
      const avg = Math.round((m2 + m1 + m0) / 3);
      const trend = m0 > m1 * 1.2 ? '↑ increasing'
        : m0 < m1 * 0.8 ? '↓ decreasing'
        : '→ stable';
      lines.push(`- ${name}: ${toNPR(m2)} | ${toNPR(m1)} | ${toNPR(m0)} | avg ${toNPR(avg)}/mo | trend: ${trend}`);
    }
  }

  // Spending account sizing guidance
  const totalDiscretionary90 = categorySpending
    .filter(c => !isOneTime(c.name))
    .reduce((s, c) => s + c.value, 0);
  const monthlyDiscretionaryAverage = Math.round(totalDiscretionary90 / 3);
  const recommendedSpendingTransferNPR = Math.round((monthlyDiscretionaryAverage * 1.15) / 1000000) * 1000;

  lines.push('\n## Spending Account Sizing Guidance');
  lines.push(`- Average monthly discretionary spend (last 90 days, one-time events excluded): ${formatCurrency(monthlyDiscretionaryAverage, primaryCurrency)}`);
  lines.push(`- Recommended spending account transfer (average × 1.15 buffer, rounded to nearest ${primaryCurrency} 1,000): ${primaryCurrency} ${recommendedSpendingTransferNPR.toLocaleString('en-US')}`);
  lines.push(`- This is a pre-calculated value. Use it directly as the spending account transfer amount. Do not recalculate.`);
  lines.push(`- Any surplus beyond this should go to the high-interest savings account`);

  // Detect salary landing account
  const salaryRecurring = recurringIncome
    .filter(r => r.amount > 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

  const salaryAccountName =
    (salaryRecurring?.accountId ? accountNameMap.get(salaryRecurring.accountId) : null) ??
    cashBankAccounts.find(a =>
      !a.isClosed &&
      (a.description?.toLowerCase().includes('salary') ||
       a.description?.toLowerCase().includes('payroll') ||
       a.description?.toLowerCase().includes('income deposited'))
    )?.name ??
    'salary account';

  // Detect high-interest savings account
  const savingsAccountName =
    cashBankAccounts.find(a =>
      !a.isClosed &&
      a.name !== salaryAccountName &&
      (a.description?.toLowerCase().includes('savings') ||
       a.description?.toLowerCase().includes('emergency') ||
       a.description?.toLowerCase().includes('highest interest') ||
       a.description?.toLowerCase().includes('high interest'))
    )?.name ??
    (() => {
      const sipRecurring = activeRecurring.find(r =>
        r.notes?.toLowerCase().includes('sip') ||
        r.name?.toLowerCase().includes('sip')
      );
      return sipRecurring?.accountId ? accountNameMap.get(sipRecurring.accountId) : null;
    })() ??
    cashBankAccounts
      .filter(a => !a.isClosed && a.accountType === 'BANK' && a.name !== salaryAccountName && a.balance > 0)
      .sort((a, b) => b.balance - a.balance)[0]?.name ??
    'savings account';

  // Detect primary spending account
  const spendingAccountName =
    cashBankAccounts.find(a =>
      !a.isClosed &&
      a.name !== salaryAccountName &&
      a.name !== savingsAccountName &&
      (a.description?.toLowerCase().includes('expense') ||
       a.description?.toLowerCase().includes('spending') ||
       a.description?.toLowerCase().includes('main account') ||
       a.description?.toLowerCase().includes('primary account'))
    )?.name ??
    (() => {
      const expenseLinks = new Map<string, number>();
      for (const r of recurringExpenses) {
        const accName = r.accountId ? accountNameMap.get(r.accountId) : null;
        if (accName && accName !== salaryAccountName && accName !== savingsAccountName) {
          expenseLinks.set(accName, (expenseLinks.get(accName) ?? 0) + 1);
        }
      }
      return [...expenseLinks.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    })() ??
    cashBankAccounts
      .filter(a =>
        !a.isClosed &&
        a.accountType === 'BANK' &&
        a.name !== salaryAccountName &&
        a.name !== savingsAccountName &&
        a.balance > 0
      )
      .sort((a, b) => b.balance - a.balance)[0]?.name ??
    'spending account';

  // Detect EMI buffer accounts
  const emiBufferAccounts = [...new Set(
    activeRecurring
      .filter(r => {
        const toName = r.toAccountId ? accountNameMap.get(r.toAccountId) : '';
        return r.transferCharge && r.transferCharge > 0 &&
               loanAccounts.some(l => accountNameMap.get(l.id) === toName ||
                 toName?.toLowerCase().includes('loan'));
      })
      .map(r => r.accountId ? accountNameMap.get(r.accountId) : null)
      .filter((name): name is string => name !== null && name !== undefined)
  )];

  lines.push('\n## Payday Step Order (pre-calculated — follow exactly)');
  lines.push('Output payday steps in this exact order. Do not reorder.');
  lines.push(`- Step 1: Transfer to EMI buffer accounts${emiBufferAccounts.length > 0 ? ` (${emiBufferAccounts.join(', ')})` : ''} — loan auto-deductions`);
  lines.push('- Step 2: Transfer to SSF or equivalent mandatory government contributions');
  lines.push(`- Step 3: Transfer to high-interest savings account (${savingsAccountName}) — SAVINGS BEFORE SPENDING`);
  lines.push(`- Step 4: Transfer to primary spending account (${spendingAccountName}) — ALWAYS LAST`);
  lines.push('VALIDATION: Before outputting, confirm Step 3 destination is the savings account and Step 4 is the spending account. If reversed, fix before outputting.');

  // Pre-build monthly calendar entries — only MONTHLY cadence items
  const monthlyCalendarItems: { day: number | null; name: string; account: string; amount: number; isVariable: boolean; isAutomatic: boolean }[] = activeRecurring
    .filter(r => {
      if (r.cadence !== 'MONTHLY') return false;
      if (r.intervalMonths >= 3) return false;
      return true;
    })
    .map(r => {
      const fromName = r.accountId ? accountNameMap.get(r.accountId) : null;
      const toName = r.toAccountId ? accountNameMap.get(r.toAccountId) : null;
      const accountName = toName ?? fromName ?? 'unknown';
      const total = Math.abs(r.amount) + (r.transferCharge ?? 0);
      const isVariable = ['electricity', 'water', 'utility', 'nea', 'internet', 'bill']
        .some(kw => r.name.toLowerCase().includes(kw) || (r.notes ?? '').toLowerCase().includes(kw));
      return {
        day: r.dayOfMonth,
        name: r.name,
        account: accountName,
        amount: total,
        isVariable,
        isAutomatic: !!r.toAccountId
      };
    })
    .filter(item => item.day !== null)
    .sort((a, b) => (a.day ?? 0) - (b.day ?? 0));

  const salaryDay = salaryRecurring?.dayOfMonth;
  if (salaryDay) {
    monthlyCalendarItems.push({
      day: salaryDay,
      name: `${salaryRecurring?.name ?? 'Salary'} deposit`,
      account: salaryAccountName,
      amount: Math.abs(salaryRecurring?.amount ?? 0),
      isVariable: false,
      isAutomatic: true
    });
    monthlyCalendarItems.sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
  }

  lines.push('\n## Monthly Calendar Items (pre-calculated — use these exactly)');
  lines.push('CRITICAL: Use ONLY these items in the monthly calendar. Do not add quarterly or yearly items.');
  lines.push('Merge SSF Pension and SSF Retirement into one consolidated "SSF contributions" entry showing their combined total.');
  for (const item of monthlyCalendarItems) {
    const amtStr = item.isVariable
      ? `~${formatCurrency(item.amount, primaryCurrency)} (variable)`
      : formatCurrency(item.amount, primaryCurrency);
    const autoStr = item.isAutomatic ? ' [AUTO]' : ' [MANUAL]';
    lines.push(`- Day ${item.day}: ${item.name} — ${amtStr} — Account: ${item.account}${autoStr}`);
  }

  // SSF totals — authoritative figures including all charges
  const ssfRecurring = activeRecurring.filter(r => {
    const toName = r.toAccountId ? accountNameMap.get(r.toAccountId) : '';
    return toName?.toLowerCase().includes('ssf');
  });

  if (ssfRecurring.length > 0) {
    lines.push('\n## SSF Contribution Totals (authoritative — use these exact figures)');
    lines.push('These include all components (base contribution + insurance charges):');
    for (const r of ssfRecurring) {
      const toName = r.toAccountId ? accountNameMap.get(r.toAccountId) : 'SSF';
      const total = Math.abs(r.amount) + (r.transferCharge ?? 0);
      lines.push(`- ${toName}: ${formatCurrency(total, primaryCurrency)}/month`);
    }
    const ssfGrandTotal = ssfRecurring.reduce((s, r) => s + Math.abs(r.amount) + (r.transferCharge ?? 0), 0);
    lines.push(`- SSF Total (all accounts combined): ${formatCurrency(ssfGrandTotal, primaryCurrency)}/month`);
    lines.push('Use these totals in payday plan steps and fixed obligations breakdown. Do not use the base amount without charges.');
  }

  // Account linking context — critical for organization analysis
  lines.push('\n## Account Linking Context');
  lines.push('Recurring payments linked to specific accounts:');
  for (const r of activeRecurring) {
    const fromAcc = r.accountId ? accountNameMap.get(r.accountId) : null;
    const toAcc = r.toAccountId ? accountNameMap.get(r.toAccountId) : null;
    if (fromAcc || toAcc) {
      const chargeStr = r.transferCharge && r.transferCharge > 0 ? ` + ${toNPR(r.transferCharge)} interest` : '';
      lines.push(`- "${r.name}" (${toNPR(Math.abs(r.amount))}${chargeStr}): ${fromAcc ?? 'unlinked'} → ${toAcc ?? 'external'}`);
    }
  }

  // Same-bank CC pair detection — bank accounts that share an institution name with a CC must be flagged KEEP
  const sameBankPairs: string[] = [];
  for (const bankAcc of cashBankAccounts) {
    if (bankAcc.isClosed) continue;
    const bankWords = bankAcc.name.toLowerCase().split(/\s+/);
    const matchedCC = ccAccounts.find(cc =>
      bankWords.some(word => word.length > 2 && cc.name.toLowerCase().includes(word))
    );
    if (matchedCC) {
      sameBankPairs.push(`- "${bankAcc.name}" (bank) and "${matchedCC.name}" (credit card) share the same institution — the bank account is used for CC payments`);
    }
  }
  if (sameBankPairs.length > 0) {
    lines.push('\n## Same-Bank Account + Credit Card Pairs (must all be KEEP)');
    lines.push(...sameBankPairs);
  }

  // Annual expense clustering detection
  const annualExpenses = activeRecurring.filter(r => r.cadence === 'YEARLY');

  const annualByMonth: Record<string, { name: string; amount: number }[]> = {};
  for (const r of annualExpenses) {
    const nextDue = getNextAnnualDue(r);
    if (!nextDue) continue;
    const daysUntilDue = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0 || daysUntilDue > 365) continue;
    const monthKey = format(nextDue, 'MMM yyyy');
    if (!annualByMonth[monthKey]) annualByMonth[monthKey] = [];
    annualByMonth[monthKey].push({
      name: r.name,
      amount: Math.abs(r.amount) + (r.transferCharge ?? 0)
    });
  }

  const heavyMonths = Object.entries(annualByMonth).filter(([, items]) => items.length >= 2);

  if (heavyMonths.length > 0) {
    lines.push('\n## Upcoming Heavy Expense Months (annual obligations clustering)');
    lines.push('These months have multiple large annual expenses due — flag in watchOut:');
    for (const [month, items] of heavyMonths) {
      const total = items.reduce((s, i) => s + i.amount, 0);
      lines.push(`- ${month}: ${items.map(i => `${i.name} (${formatCurrency(i.amount, primaryCurrency)})`).join(' + ')} = ${formatCurrency(total, primaryCurrency)} total`);
    }
  }

  const upcomingAnnualItems = annualExpenses
    .map(r => ({ r, nextDue: getNextAnnualDue(r) }))
    .filter(({ nextDue }) => {
      if (!nextDue) return false;
      const days = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 90;
    })
    .sort((a, b) => a.nextDue!.getTime() - b.nextDue!.getTime());

  if (process.env.NODE_ENV === 'development') {
    console.log('[ai-organization] salary account detected:', salaryAccountName);
    console.log('[ai-organization] savings account detected:', savingsAccountName);
    console.log('[ai-organization] spending account detected:', spendingAccountName);
    console.log('[ai-organization] annual expenses found:', annualExpenses.length);
    console.log('[ai-organization] upcoming annual (within 90 days):',
      upcomingAnnualItems.map(({ r, nextDue }) => ({
        name: r.name,
        nextDue: nextDue?.toISOString(),
        amount: formatCurrency(Math.abs(r.amount) + (r.transferCharge ?? 0), primaryCurrency)
      }))
    );
    console.log('[ai-organization] annual clustering by month:',
      Object.entries(annualByMonth).map(([month, items]) => ({
        month,
        itemCount: items.length,
        total: formatCurrency(items.reduce((s, i) => s + i.amount, 0), primaryCurrency),
        items: items.map(i => i.name)
      }))
    );
  }

  if (upcomingAnnualItems.length > 0) {
    lines.push('\n## Upcoming Annual Expenses (due within 90 days — pre-calculated dates, do not modify)');
    lines.push('CRITICAL: Use ONLY these exact dates in upcomingAnnual output. Do not invent or recalculate dates.');
    for (const { r, nextDue } of upcomingAnnualItems) {
      const total = Math.abs(r.amount) + (r.transferCharge ?? 0);
      lines.push(`- ${r.name}: ${formatCurrency(total, primaryCurrency)} due ${format(nextDue!, 'dd MMM yyyy')}`);
    }
  } else {
    lines.push('\n## Upcoming Annual Expenses (due within 90 days)');
    lines.push('No annual expenses due within the next 90 days. Do NOT populate upcomingAnnual from other data sources.');
  }

  if (assetsWithMarket.length > 0) {
    lines.push('\n## Investment Assets');
    lines.push('Asset allocation by type:');
    for (const [type, val] of Object.entries(allocationByType)) {
      lines.push(`  - ${type}: cost ${toNPR(val.cost)}, market ${toNPR(val.market)} (${pct(val.market, totalAssetMarket)} of portfolio)`);
    }
    lines.push('Individual holdings:');
    for (const a of assetsWithMarket) {
      const pnlStr = a.pnl != null
        ? ` | P&L: ${a.pnl >= 0 ? '+' : ''}${toNPR(a.pnl)}`
        : '';
      lines.push(`  - ${a.name} (${a.type}): ${a.quantity} ${a.unit}, Cost ${toNPR(a.totalPaid)}${a.marketValue != null ? `, Market ${toNPR(a.marketValue)}` : ''}${pnlStr}`);
    }
  }

  if (notedTransactions.length > 0) {
    lines.push('\n## User Notes on Transactions (last 90 days)');
    for (const t of notedTransactions) {
      const sign = t.amount >= 0 ? '+' : '';
      lines.push(`- ${format(new Date(t.date), 'dd MMM')}: ${t.payee} ${sign}${toNPR(t.amount)} — "${t.notes}"`);
    }
  }

  const context = lines.join('\n');

  const systemPrompt = `You are a personal finance advisor for a user in Nepal. Your job is to analyze their accounts, loans, and recurring payments and produce a structured "Financial Organization" guide — NOT general investment advice.

CRITICAL RULES:
- All monetary amounts are already converted to NPR. Do not divide or multiply them further.
- Accounts marked [CLOSED] are already inactive. Never mention them in recommendations.
- Gold and silver are cultural assets in Nepal, often purchased for weddings — do not recommend selling them.
- SSF contributions are mandatory obligations, not discretionary. Never suggest stopping or reducing them.
- Do not recommend closing any account that has a stated purpose in its description.
- NEPSE = Nepal stock exchange, SSF = Social Security Fund, SIP = Systematic Investment Plan, NEA = Nepal Electricity Authority.

────────────────────────────────────────
CREDIT CARD HANDLING
────────────────────────────────────────
- Credit card balances shown are the current unbilled running balance — NOT a statement due amount.
- Do NOT include credit card payment as a payday transfer step unless there is an explicit overdue or due statement with a known amount.
- Credit cards are paid from the user's spending account at statement time — this is NOT a payday routing concern.
- Never invent a credit card payment amount from the running balance.

────────────────────────────────────────
RECURRING PAYMENTS HANDLING
────────────────────────────────────────
- Recurring payment entries are reminders to pay, not exact committed amounts. The amount shown is an estimate only.
- Variable bills (electricity, water, internet, utilities) fluctuate month to month — use the recurring amount as a rough estimate only. Label these as "~NPR X (variable)" in the calendar and budget.
- Never treat a recurring utility bill amount as exact or guaranteed.
- For the payday plan, utility bills should be covered by the general spending account buffer, not as a separate transfer line item.
- Only include a recurring item as a separate payday step if it is a fixed, known obligation: EMI payments, SSF contributions, SIP investments.

────────────────────────────────────────
PAYDAY PLAN RULES
────────────────────────────────────────
- Start from the salary landing account (identified from recurring income or account description).
- Steps must sum exactly to the salary amount. Verify this before outputting.
- Do NOT create a separate step for credit card payment funding.
- Do NOT create a separate step for variable utility bills — these are covered by the spending account.
- Priority order for steps:
  1. Mandatory fixed obligations (SSF contributions, loan EMI buffers)
  2. If a peer loan with an agreed monthly repayment exists, include it here
  3. Savings and investments (SIP buffer if not auto-deducted, emergency fund top-up)
  4. Spending account transfer — use the "Recommended spending account transfer" value from the context section "Spending Account Sizing Guidance" directly. Do not exceed this amount and do not recalculate it.
  5. Any surplus after the spending account transfer goes to the high-interest savings account — NOT left in the salary account. The salary account earns less interest than dedicated savings.
- Do NOT add a final "keep as buffer in salary account" step — idle money should move to the savings account.
- SSF CONSOLIDATION: SSF Pension and SSF Retirement must always be combined into a single payday step even though they are technically different destination accounts — they are always executed together. Use "SSF" as the "to" field. List both in the covers array: e.g. ["SSF Pension — NPR 2,759", "SSF Retirement — NPR 1,018"].
- Maximum allowed in salary account after all steps: NPR 10,000.
- Label each step's amount as exact (for fixed items like SSF) or estimated (for variable items).

────────────────────────────────────────
SECTION 1: ACCOUNT HEALTH CHECK
────────────────────────────────────────
For each active (non-closed) account, provide a keep/close/review recommendation.

Rules:
- KEEP: Account has a clear active purpose (salary landing, EMI deduction, high-interest savings, active spending, active investment, linked to a credit card payment)
- REVIEW: Account has unclear or redundant purpose, zero balance, and no linked recurring payments
- CLOSE: Truly redundant, no purpose, no linked payments, zero balance, better alternative exists
- CASH accounts and digital wallets (eSewa, Khalti, similar mobile wallets) should almost always be KEEP — a low balance is NORMAL and INTENTIONAL, never use it as a reason to mark Review or Close
- Dedicated-purpose accounts (EV charging wallet, travel card, broker/TMS account) must always be KEEP if their description states a specific use case, regardless of current balance
- A stock trading or broker account (e.g. NAASA TMS) must always be KEEP if the user holds any active stock positions
- If a bank account belongs to the same institution as an active credit card (e.g. HBL bank account + HBL credit card), mark it KEEP — it is almost certainly used for credit card payments even if not explicitly linked in recurring payments data

For each account output:
- name: account name
- type: account type
- balance: current balance in NPR
- recommendation: "KEEP" | "REVIEW" | "CLOSE"
- role: if KEEP, assign a clear role label
- reason: one specific sentence referencing the account description, balance, and any linked recurring payments

────────────────────────────────────────
SECTION 2: ACCOUNT ROLES
────────────────────────────────────────
- Assign a clear purpose to each KEEP account.
- Salary account = pass-through only, money flows out on payday.
- Do not suggest moving money from a high-interest savings account to a low-interest one.
- If an account is linked to a credit card (e.g. used to pay a specific card), state that explicitly.

────────────────────────────────────────
SECTION 3: PAYDAY PLAN
────────────────────────────────────────
See PAYDAY PLAN RULES above.

STEP ORDER — FOLLOW THE PRE-CALCULATED ORDER IN CONTEXT DATA:
- The "Payday Step Order" section in the context data shows the exact required step order for this user. Follow it precisely.
- The savings account is always Step 3. The spending account is always Step 4. This applies to every user regardless of their account names or balances.
- SELF-CHECK before outputting: Is Step 3 transferring to the savings account? Is Step 4 transferring to the spending account? If not, reorder before outputting.
- Never output spending before savings. A response with spending before savings is incorrect and must be fixed.

CONSOLIDATION RULE — STRICTLY ENFORCED:
- There must be EXACTLY ONE step per destination account. No exceptions.
- The high-interest savings account (e.g. Laxmi Sunrise) must be a SINGLE step combining ALL of the following in its covers array: (1) each annual/quarterly set-aside named individually, (2) SIP buffer if auto-deducted from this account, (3) savings target amount, (4) surplus savings (remainder after all above). Never split savings into a separate "set-asides step" and a "surplus step" — always one consolidated step.
- If multiple obligations go to the same account (e.g. home loan buffer + SIP buffer + annual set-asides all go to Laxmi Sunrise), they MUST be combined into a single step with the summed total.
- The "covers" array lists everything included in that single transfer.
- After consolidation, you should have at most 4-5 steps total for a typical user (one per unique destination account).
- Do NOT create separate steps for "home loan buffer", "SIP buffer", "annual obligations buffer" if they all go to the same savings account — combine them.

Format each step as:
- step: number
- action: what to do (e.g. "Transfer to RBB for car EMI buffer")
- amount: NPR amount as a number
- isEstimated: true | false
- from: source account name
- to: destination account name
- reason: one sentence explanation
- covers: array of strings listing what this transfer covers

COVERS ARRAY RULES — STRICTLY ENFORCED:
- Only list items explicitly known from the recurring payments data
- For SSF steps: list each contribution by name and amount only — e.g. ["SSF Pension — NPR 2,759", "SSF Retirement — NPR 1,018"]. Do NOT invent sub-components like "pension portion", "insurance portion", or "interest" — the internal SSF allocation is not visible in the data
- For EMI steps: list only the total transfer amount — e.g. ["Car EMI — NPR 32,000 (auto-deducted day 1)"]. Do NOT invent a principal/interest split unless it is explicitly provided as separate recurring payment line items
- For savings steps: list named set-asides and surplus — e.g. ["SIP N31 buffer — NPR 5,004", "Home loan set-aside — NPR 10,667", "Surplus savings — NPR X"]
- Never add a covers item that is not directly supported by the data
- VALIDATION: The sum of all amount values in the covers array must equal the step's total amount exactly. If items do not sum to the total, adjust the "Surplus savings" item to absorb the difference rather than leaving a discrepancy.

────────────────────────────────────────
SECTION 4: MONTHLY ROUTINE CALENDAR
────────────────────────────────────────
- The "Monthly Calendar Items" section in the context data contains the pre-filtered, authoritative list of monthly calendar entries. Use ONLY these items.
- YEARLY and QUARTERLY items are already excluded from that list — do not add them back under any circumstances.
- The salary deposit entry is already included in the list.
- SSF Pension and SSF Retirement must be merged into one calendar entry showing the combined total. Use "SSF contributions" as the name.
- QUARTERLY items must NEVER appear in upcomingAnnual — they are NOT annual expenses.
- The upcomingAnnual array must contain ONLY items explicitly listed in the "Upcoming Annual Expenses (due within 90 days)" section of the context data, using the exact dates provided.
- If that section says no expenses are due within 90 days, output upcomingAnnual as an empty array [].
- Never source upcomingAnnual dates from the Recurring Expenses section — those entries have unreliable due dates.
- Never calculate or invent due dates. Only use pre-calculated dates from the context.
- The upcomingAnnual strings must follow this format exactly: "MMM DD — [Name] — [Currency] [Amount]". Example: "Jul 15 — Reliable Life Insurance (New) — NPR 101,400"
- Variable bills must be labeled with "~" before the amount and marked isVariable: true.
- Flag any days where 2 or more obligations fall within 2 days of each other as a cash flow collision risk.
- Check the "Upcoming Heavy Expense Months" section in the context. For each month listed there, add a watchOut warning naming the month, listing each expense with its amount, and showing the total cash required. This is more important than day-level collision warnings. Example: "May is a heavy month: Car Bluebook (NPR 15,500) + Car Insurance (NPR 38,714) + Worldlink (NPR 17,384) = NPR 71,598 due. Ensure your savings account has sufficient accumulated set-asides."

────────────────────────────────────────
SECTION 5: BUDGET ALLOCATION
────────────────────────────────────────
- Fixed obligations = sum of all monthly recurring fixed costs + monthly equivalents of annual/quarterly fixed costs (divide annual by 12, quarterly by 3).
- Monthly equivalents of annual costs must be included in fixed obligations total.
- Variable utility bills: include as estimated monthly cost, labeled as variable.
- SAVINGS TARGET — CRITICAL: Read the exact "Savings Rate: X%" from the Cash Flow section. Do NOT guess or default to 25%. Rounding rules: 21-24% → 20%, 25-27% → 25%, 28-32% → 30%, 33-37% → 35%. savings target amount = monthly income × (rounded % ÷ 100). The JSON savingsTarget.percentage MUST match this derived value. If the data shows 27%, output 25. If 33%, output 35. NEVER output 25 if the actual rate differs.
- Use the same savings target percentage consistently in the payday plan, budget allocation, and any summary.
- Discretionary budget = income - fixed obligations - savings target.
- Do NOT recalculate or re-sum fixed obligations breakdown items — use the total as stated. Rounding differences in individual items will cause mismatch.
- For category budgets, use the "Category Spending by Month" data provided:
  - Set recommended amount = the 3-month average for that category (the "avg X/mo" value in the data)
  - Set status based on current month vs average:
    - "ok": current month within 20% of average
    - "over": current month exceeds average by more than 20%
    - "under": current month is more than 30% below average — only use when meaningfully low
  - If trend is "↑ increasing" and status is "over", flag this in the category
  - If trend is "↓ decreasing" and status is "under", note it as potentially intentional
  - If a category only appears in 1-2 months, mark status as "ok" and note limited data
  - Current month figures in the data are scaled estimates based on days elapsed in the month — they are approximate, not exact
  - If a category's current month figure is more than 80% below its 3-month average, this almost certainly indicates incomplete or scaled data rather than a real spending drop — mark status as "ok" and add a note explaining the data may be partial
  - Never mark a category "under" purely because of a large current-month drop without considering that the month may not be complete
- If "Marriage Expenses" or similar one-time categories appear in spending data, exclude them entirely from discretionary budget calculation and note this.

────────────────────────────────────────
OUTPUT FORMAT
────────────────────────────────────────
Return ONLY a valid JSON object (no markdown, no code blocks):

{
  "accountHealth": [
    {
      "name": "Account name",
      "type": "BANK",
      "balance": 385455,
      "recommendation": "KEEP",
      "role": "Emergency Fund & Long-term Savings",
      "reason": "High-interest savings account with NPR 385,455, linked to SIP auto-deduction on day 15."
    }
  ],
  "accountRoles": [
    {
      "name": "Account name",
      "role": "Role label",
      "purpose": "One line description of what this account should be used for"
    }
  ],
  "paydayPlan": {
    "salaryAccount": "Everest",
    "salaryAmount": 313500,
    "salaryDay": 16,
    "steps": [
      {
        "step": 1,
        "action": "Transfer to RBB for car EMI buffer",
        "amount": 30000,
        "isEstimated": false,
        "from": "Everest",
        "to": "Rastriya Banijya",
        "reason": "Pre-fund RBB so Car EMI auto-deducts on day 1 without shortfall",
        "covers": ["Car EMI — NPR 30,000 (auto-deducted day 1)"]
      },
      {
        "step": 2,
        "action": "Transfer to SSF",
        "amount": 3777,
        "isEstimated": false,
        "from": "Everest",
        "to": "SSF",
        "reason": "Mandatory monthly SSF contributions",
        "covers": ["SSF Pension — NPR 2,759", "SSF Retirement — NPR 1,018"]
      }
    ],
    "totalAllocated": 313500,
    "notes": ["All steps sum to exactly NPR 313,500"]
  },
  "monthlyRoutine": {
    "calendar": [
      {
        "day": 1,
        "action": "Car EMI auto-deducted",
        "account": "Rastriya Banijya",
        "amount": 30000,
        "isAutomatic": true,
        "isVariable": false
      },
      {
        "day": 20,
        "action": "Pay NEA electricity bill",
        "account": "Nabil",
        "amount": 3000,
        "isAutomatic": false,
        "isVariable": true
      }
    ],
    "watchOut": ["Days 15-16 are busy: SIP auto-deduction, salary deposit, and SSF contributions all fall within 2 days"],
    "upcomingAnnual": [
      "Jul 15 — Reliable Life Insurance (New) — NPR 101,400",
      "Jul 16 — Home Loan EMI (quarterly) — NPR 32,000"
    ]
  },
  "budgetAllocation": {
    "monthlyIncome": 313500,
    "fixedObligations": {
      "total": 58482,
      "breakdown": [
        { "name": "Car EMI", "amount": 30000, "isEstimated": false },
        { "name": "SSF Pension + Insurance", "amount": 2759, "isEstimated": false },
        { "name": "SSF Retirement", "amount": 1018, "isEstimated": false },
        { "name": "SIP N31", "amount": 5004, "isEstimated": false },
        { "name": "Youtube Premium", "amount": 146, "isEstimated": false },
        { "name": "NEA electricity (variable)", "amount": 3000, "isEstimated": true },
        { "name": "Life Insurance New (annual ÷ 12)", "amount": 8450, "isEstimated": false },
        { "name": "Life Insurance Old (annual ÷ 12)", "amount": 1554, "isEstimated": false },
        { "name": "Car Insurance (annual ÷ 12)", "amount": 3226, "isEstimated": false },
        { "name": "Worldlink (annual ÷ 12)", "amount": 1449, "isEstimated": false },
        { "name": "Car Bluebook (annual ÷ 12)", "amount": 1292, "isEstimated": false },
        { "name": "Bike Insurance + Bluebook (annual ÷ 12)", "amount": 584, "isEstimated": false }
      ]
    },
    "savingsTarget": {
      "percentage": 25,
      "amount": 78375
    },
    "discretionaryBudget": {
      "total": 176643,
      "categories": [
        {
          "name": "Food & Drinks",
          "recommended": 55000,
          "actual": 43302,
          "status": "under"
        }
      ]
    },
    "notes": [
      "Marriage expenses excluded from discretionary calculation — one-time event",
      "NEA amount is variable — actual bill may differ from estimate"
    ]
  }
}`;

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
        maxOutputTokens: 65536,
        temperature: 0.2
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI ${res.status}: ${errText}`);
  }

  const aiResponse = await res.json();
  const finishReason = aiResponse.candidates?.[0]?.finishReason;
  const rawText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (process.env.NODE_ENV === 'development') {
    console.log('[ai-organization] finishReason:', finishReason);
    console.log('[ai-organization] rawText length:', rawText.length);
    if (rawText.length < 500) console.log('[ai-organization] rawText:', rawText);
  }

  const text = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return Response.json({ error: 'Failed to parse AI response', raw: rawText, finishReason }, { status: 500 });
  }

  const modelUsed = useVertexAI ? 'gemini-2.5-flash (vertex)' : 'gemini-2.5-flash';
  await db.insert(aiOrganizationReports).values({
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
