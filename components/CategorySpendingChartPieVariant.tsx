import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { formatPercentage } from '@/lib/utils';
import { CategorySpendingChartTooltip } from '@/components/CategorySpendingChartTooltip';

const colors = [
  '#FFC107',
  '#FF5722',
  '#03A9F4',
  '#4CAF50',
  '#9C27B0',
  '#E91E63',
  '#00BCD4',
  '#FF9800',
  '#8BC34A',
  '#CDDC39'
];

type Props = {
  data: {
    name: string;
    value: number;
  }[];
};

export const CategorySpendingChartPieVariant = ({ data }: Props) => {
  return (
    <ResponsiveContainer width='100%' height={350}>
      <PieChart>
        <Legend
          layout='horizontal'
          verticalAlign='bottom'
          align='center'
          iconType='circle'
          content={({ payload }) => (
            <ul className='flex flex-col space-y-2'>
              {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                payload?.map((entry: any, index: number) => (
                  <li key={`item-${index}`} className='flex items-center space-x-2'>
                    <span className='size-2 rounded-full' style={{ backgroundColor: entry.color }} />
                    <div className='space-x-1'>
                      <span className='text-sm text-muted-foreground'>{entry.value}:</span>
                      <span className='text-sm'>{formatPercentage(entry.payload.percent * 100)}</span>
                    </div>
                  </li>
                ))
              }
            </ul>
          )}
        />
        <Tooltip content={<CategorySpendingChartTooltip />} />
        <Pie
          cx='50%'
          cy='50%'
          data={data}
          fill='#8884d4'
          dataKey='value'
          outerRadius={90}
          innerRadius={60}
          paddingAngle={2}
          labelLine={false}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
