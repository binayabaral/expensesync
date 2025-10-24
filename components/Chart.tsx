import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, BarChart, FileSearch, LineChart, Loader2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import BarVariant from '@/components/ChartBarVariant';
import AreaVariant from '@/components/ChartAreaVariant';
import LineVariant from '@/components/ChartLineVariant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  isLoading?: boolean;
  data?: {
    date: string;
    income: number;
    expenses: number;
  }[];
};

function Chart({ isLoading, data = [] }: Props) {
  const [chartType, setChartType] = useState<string>('area');

  if (isLoading) {
    return (
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-8 w-full lg:w-28' />
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
        <CardTitle className='text-2xl'>Transactions</CardTitle>
        <Select defaultValue={chartType} onValueChange={setChartType}>
          <SelectTrigger className='lg:w-auto h-9 rounded-md px-3'>
            <SelectValue placeholder='Chart Type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='area'>
              <div className='flex items-center'>
                <AreaChart className='size-4 mr-2 shrink-0' />
                <p>Area Chart</p>
              </div>
            </SelectItem>
            <SelectItem value='line'>
              <div className='flex items-center'>
                <LineChart className='size-4 mr-2 shrink-0' />
                <p>Line Chart</p>
              </div>
            </SelectItem>
            <SelectItem value='bar'>
              <div className='flex items-center'>
                <BarChart className='size-4 mr-2 shrink-0' />
                <p>Bar Chart</p>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className='flex flex-col gap-y-4 items-center justify-center h-[300px] w-full'>
            <FileSearch className='size-6 text-muted-foreground' />
            <p className='text-muted-foreground text-sm'>No data for this period</p>
          </div>
        ) : (
          <>
            {chartType === 'area' && <AreaVariant data={data} />}
            {chartType === 'bar' && <BarVariant data={data} />}
            {chartType === 'line' && <LineVariant data={data} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default Chart;
