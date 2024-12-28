import { format } from 'date-fns';
import { Tooltip, XAxis, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

import { ChartTooltip } from '@/components/ChartTooltip';

type Props = {
  data: {
    date: string;
    income: number;
    expenses: number;
  }[];
};

function LineVariant({ data }: Props) {
  return (
    <ResponsiveContainer width='100%' height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis
          axisLine={false}
          tickLine={false}
          dataKey='date'
          tickFormatter={value => format(value, 'dd MMM')}
          style={{ fontSize: '12px' }}
          tickMargin={16}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line dataKey='income' dot={false} stroke='#16a34a' strokeWidth={2} className='drop-shadow-sm' />
        <Line dataKey='expenses' dot={false} stroke='#f43f5e' strokeWidth={2} className='drop-shadow-sm' />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default LineVariant;
