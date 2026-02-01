'use client';

import { scaleSymlog } from 'd3-scale';
import { format } from 'date-fns/format';
import { FileSearch, Loader2 } from 'lucide-react';
import { Area, CartesianGrid, ResponsiveContainer, XAxis, YAxis, AreaChart, Tooltip } from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import { useGetHealth } from '@/features/health/api/useGetHealth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthChartTooltip } from '@/components/HealthChartTooltip';
import { formatCurrency } from '@/lib/utils';

function Chart() {
  const { data, isLoading } = useGetHealth();
  const scale = scaleSymlog();

  const gradientOffset = () => {
    const values = (data?.netWorthOverTime ?? []).map(d => d.balance);
    if (!values.length) return 0.5;

    const min = Math.min(...values);
    const max = Math.max(...values);

    const s = scaleSymlog().domain([min, max]).range([1, 0]).clamp(true);
    return s(0);
  };

  const off = gradientOffset();

  if (isLoading) {
    return (
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between'>
          <Skeleton className='h-7 w-40' />
        </CardHeader>
        <CardContent>
          <div className='w-full h-[300px] flex items-center justify-center'>
            <Loader2 className='h-6 w-6 text-slate-300 animate-spin' />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border border-slate-200 shadow-none'>
      <CardHeader className='flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between'>
        <CardTitle className='text-lg font-semibold'>Net worth over time</CardTitle>
      </CardHeader>
      <CardContent>
        {data?.netWorthOverTime.length === 0 ? (
          <div className='flex flex-col gap-y-4 items-center justify-center h-[300px] w-full'>
            <FileSearch className='size-6 text-muted-foreground' />
            <p className='text-muted-foreground text-sm'>No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={300}>
            <AreaChart data={data?.netWorthOverTime}>
              <CartesianGrid strokeDasharray='3 3' />
              <defs>
                <linearGradient id='balance' x1={0} y1={0} x2={0} y2={1}>
                  <stop offset='0' stopColor='#16a34a' stopOpacity={0.8} />
                  <stop offset={off} stopColor='#16a34a' stopOpacity={0} />
                  <stop offset={off} stopColor='#f43f5e' stopOpacity={0} />
                  <stop offset='1' stopColor='#f43f5e' stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <YAxis
                scale={scale}
                style={{ fontSize: '12px' }}
                tickFormatter={value => formatCurrency(value, true)}
                tickCount={8}
              />
              <Tooltip content={<HealthChartTooltip />} />
              <XAxis
                axisLine={false}
                tickLine={false}
                dataKey='date'
                tickFormatter={value => format(value, 'dd MMM')}
                style={{ fontSize: '12px' }}
                tickMargin={16}
              />
              <Area type='monotone' dataKey='balance' stroke='#000' fill='url(#balance)' />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default Chart;
