import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';

import { convertAmountFromMiliUnits } from '@/lib/utils';

type Props = {
  data: {
    name: string;
    value: number;
  }[];
};

export const PayeeSpendingChartRadarVariant = ({ data }: Props) => {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <RadarChart
        cx='50%'
        cy='50%'
        outerRadius='80%'
        data={data.map(d => ({ ...d, value: convertAmountFromMiliUnits(d.value) }))}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey='name' style={{ fontSize: '12px' }} />
        <PolarRadiusAxis style={{ fontSize: '12px' }} />
        <Radar dataKey='value' stroke='#16a34a' fill='#16a34a' fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
};
