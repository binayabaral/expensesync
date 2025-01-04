import { format } from 'date-fns';
import { scaleSymlog } from 'd3-scale';
import { Tooltip, XAxis, AreaChart, Area, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';

import { ChartTooltip } from '@/components/ChartTooltip';

type Props = {
  data: {
    date: string;
    income: number;
    expenses: number;
  }[];
};

function AreaVariant({ data }: Props) {
  const scale = scaleSymlog();

  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray='3 3' />
        <defs>
          <linearGradient id='income' x1={0} y1={0} x2={0} y2={1}>
            <stop offset='2%' stopColor='#16a34a' stopOpacity={0.8} />
            <stop offset='98%' stopColor='#16a34a' stopOpacity={0} />
          </linearGradient>
          <linearGradient id='expenses' x1={0} y1={0} x2={0} y2={1}>
            <stop offset='2%' stopColor='#f43f5e' stopOpacity={0.8} />
            <stop offset='98%' stopColor='#f43f5e' stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis scale={scale} hide={true} />
        <XAxis
          axisLine={false}
          tickLine={false}
          dataKey='date'
          tickFormatter={value => format(value, 'dd MMM')}
          style={{ fontSize: '12px' }}
          tickMargin={16}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type='monotone'
          dataKey='income'
          stackId='income'
          strokeWidth={2}
          stroke='#16a34a'
          fill='url(#income)'
          className='drop-shadow-sm'
        />
        <Area
          type='monotone'
          dataKey='expenses'
          stackId='expenses'
          strokeWidth={2}
          stroke='#f43f5e'
          fill='url(#expenses)'
          className='drop-shadow-sm'
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default AreaVariant;
