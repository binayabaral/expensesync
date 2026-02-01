import { RadialBar, Legend, RadialBarChart, ResponsiveContainer } from 'recharts';

import { convertAmountFromMiliUnits, convertAmountToMiliUnits, formatCurrency } from '@/lib/utils';

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

export const PayeeSpendingChartRadialVariant = ({ data }: Props) => {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <RadialBarChart
        cx='50%'
        cy='50%'
        innerRadius='90%'
        outerRadius='40%'
        barSize={10}
        data={data.map((item, index) => ({
          ...item,
          fill: colors[index % colors.length],
          value: convertAmountFromMiliUnits(item.value)
        }))}
      >
        <RadialBar
          background
          dataKey='value'
          label={{
            position: 'insideStart',
            fill: '#ffffff',
            fontSize: '12px'
          }}
        />
        <Legend
          layout='horizontal'
          verticalAlign='bottom'
          align='center'
          iconType='circle'
          content={({ payload }) => (
            <ul className='flex flex-wrap justify-center space-x-2'>
              {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                payload?.map((entry: any, index: number) => (
                  <li key={`item-${index}`} className='flex items-center space-x-2'>
                    <span className='size-2 rounded-full' style={{ backgroundColor: entry.color }} />
                    <div className='space-x-1'>
                      <span className='text-xs text-muted-foreground'>{entry.value}:</span>
                      <span className='text-xs'>{formatCurrency(convertAmountToMiliUnits(entry.payload.value))}</span>
                    </div>
                  </li>
                ))
              }
            </ul>
          )}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
};
