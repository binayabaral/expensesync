import { format } from 'date-fns';
import { scaleSymlog } from 'd3-scale';
import { Tooltip, XAxis, ResponsiveContainer, BarChart, Bar, CartesianGrid, YAxis } from 'recharts';

import { ChartTooltip } from '@/components/ChartTooltip';

type Props = {
  data: {
    date: string;
    income: number;
    expenses: number;
  }[];
};

function BarVariant({ data }: Props) {
  const scale = scaleSymlog();

  return (
    <ResponsiveContainer width='100%' height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray='3 3' />
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
        <Bar dataKey='income' fill='#16a34a' className='drop-shadow-sm' />
        <Bar dataKey='expenses' fill='#f43f5e' className='drop-shadow-sm' />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default BarVariant;
