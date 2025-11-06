'use client';

import { scaleSymlog } from 'd3-scale';
import { format } from 'date-fns/format';
import { FileSearch, Loader2 } from 'lucide-react';
import { CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetHealth } from '@/features/health/api/useGetHealth';
import { HealthChartTooltip } from '@/components/HealthChartTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Chart() {
  const { data, isLoading } = useGetHealth();
  const scale = scaleSymlog();

  if (isLoading) {
    return (
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between'>
          <Skeleton className='h-8 w-48' />
        </CardHeader>
        <CardContent>
          <div className='w-full h-80 flex items-center justify-center'>
            <Loader2 className='h-6 w-6 text-slate-300 animate-spin' />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border border-slate-200 shadow-none'>
      <CardHeader className='flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between'>
        <CardTitle className='text-2xl'>Net worth over time</CardTitle>
      </CardHeader>
      <CardContent>
        {data?.netWorthOverTime.length === 0 ? (
          <div className='flex flex-col gap-y-4 items-center justify-center h-[300px] w-full'>
            <FileSearch className='size-6 text-muted-foreground' />
            <p className='text-muted-foreground text-sm'>No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={data?.netWorthOverTime} margin={{ left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <YAxis scale={scale} style={{ fontSize: '10px' }} tickFormatter={value => formatCurrency(value)} tickCount={1000}/>
              <Tooltip content={<HealthChartTooltip />} />
              <XAxis
                axisLine={false}
                tickLine={false}
                dataKey='date'
                tickFormatter={value => format(value, 'dd MMM')}
                style={{ fontSize: '12px' }}
                tickMargin={16}
              />
              <Line dataKey='balance' dot={false} stroke='#3B82F6' strokeWidth={2} className='drop-shadow-sm' />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default Chart;
