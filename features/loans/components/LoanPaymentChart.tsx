'use client';

import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoanResponseType } from '@/features/loans/api/useGetLoans';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

type Props = {
  loans: LoanResponseType[];
};

export const LoanPaymentChart = ({ loans }: Props) => {
  const chartLoans = loans;

  if (chartLoans.length === 0) return null;

  const today = new Date();
  const months: Array<{ label: string; end: Date }> = [];
  for (let i = 23; i >= 0; i--) {
    const d = subMonths(today, i);
    months.push({ label: format(startOfMonth(d), 'MMM yyyy'), end: endOfMonth(d) });
  }

  const chartData = months.map(({ label, end }) => {
    const entry: Record<string, string | number> = { date: label };
    chartLoans.forEach(loan => {
      if (loan.loanStartDate && end < new Date(loan.loanStartDate)) {
        entry[loan.name] = 0;
        return;
      }
      if (loan.isClosed && loan.closedAt && end > new Date(loan.closedAt)) {
        entry[loan.name] = 0;
        return;
      }
      const paymentsAfter = (loan.paymentHistory ?? [])
        .filter(p => new Date(p.date) > end)
        .reduce((s, p) => s + p.amount, 0);
      const borrowingsAfter = (loan.borrowingHistory ?? [])
        .filter(b => new Date(b.date) > end)
        .reduce((s, b) => s + b.amount, 0);
      entry[loan.name] = Math.abs(loan.currentBalance - paymentsAfter - borrowingsAfter);
    });
    return entry;
  });

  const firstWithData = chartData.findIndex(d => chartLoans.some(l => (d[l.name] as number) > 0));
  const visibleData = firstWithData >= 0 ? chartData.slice(firstWithData) : chartData;

  return (
    <Card className='border border-slate-200 shadow-none'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>Outstanding Balance by Loan</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={260}>
          <AreaChart data={visibleData} margin={{ left: 10, right: 10, top: 4 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <defs>
              {chartLoans.map((loan, i) => (
                <linearGradient key={loan.id} id={`grad_${loan.id}`} x1={0} y1={0} x2={0} y2={1}>
                  <stop offset='2%' stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                  <stop offset='98%' stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              axisLine={false}
              tickLine={false}
              dataKey='date'
              tickFormatter={v => v.split(' ')[0]}
              style={{ fontSize: '11px' }}
              tickMargin={8}
              tick={{ fill: '#94a3b8' }}
              interval={1}
            />
            <YAxis
              style={{ fontSize: '11px' }}
              tickFormatter={v => formatCurrency(v, true)}
              tickCount={6}
              tick={{ fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const entries = payload.filter(p => (p.value as number) > 0).sort((a, b) => (b.value as number) - (a.value as number));
                if (entries.length === 0) return null;
                const total = entries.reduce((s, p) => s + (p.value as number), 0);
                return (
                  <div className='bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-sm min-w-[180px]'>
                    <p className='font-semibold text-slate-700 mb-2'>{label}</p>
                    {entries.map((p, i) => (
                      <div key={i} className='flex justify-between gap-4 py-0.5'>
                        <div className='flex items-center gap-2'>
                          <span className='size-2 rounded-full shrink-0' style={{ backgroundColor: p.color as string }} />
                          <span className='text-slate-600 truncate max-w-[100px]'>{p.name}</span>
                        </div>
                        <span className='font-medium text-slate-800 shrink-0'>{formatCurrency(p.value as number)}</span>
                      </div>
                    ))}
                    {entries.length > 1 && (
                      <div className='flex justify-between gap-4 pt-2 mt-1 border-t border-slate-100'>
                        <span className='text-slate-500'>Total</span>
                        <span className='font-semibold text-slate-800'>{formatCurrency(total)}</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {chartLoans.map((loan, i) => (
              <Area
                key={loan.id}
                type='monotone'
                dataKey={loan.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                fill={`url(#grad_${loan.id})`}
                className='drop-shadow-sm'
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        {chartLoans.length > 1 && (
          <div className='flex flex-wrap gap-3 mt-3 justify-center'>
            {chartLoans.map((loan, i) => (
              <div key={loan.id} className='flex items-center gap-2 text-xs text-slate-600'>
                <span className='size-2.5 rounded-full shrink-0' style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {loan.name}
                {loan.isClosed && <span className='text-slate-400'>(closed)</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
