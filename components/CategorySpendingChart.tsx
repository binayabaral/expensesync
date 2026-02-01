import { useState } from 'react';
import { FileSearch, Loader2, PieChart, Radar, Target } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategorySpendingChartPieVariant } from '@/components/CategorySpendingChartPieVariant';
import CategorySpendingChartRadarVariant from '@/components/CategorySpendingChartRadarVariant';
import { CategorySpendingChartRadialVariant } from '@/components/CategorySpendingChartRadialVariant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  isLoading?: boolean;
  data?: {
    name: string;
    value: number;
  }[];
};

function CategorySpendingChart({ isLoading, data = [] }: Props) {
  const [chartType, setChartType] = useState<string>('pie');

  if (isLoading) {
    return (
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between'>
          <Skeleton className='h-7 w-28' />
          <Skeleton className='h-9 w-full lg:w-28' />
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
        <CardTitle className='text-lg font-semibold'>Categories</CardTitle>
        <Select defaultValue={chartType} onValueChange={setChartType}>
          <SelectTrigger className='lg:w-auto h-9 rounded-md px-3'>
            <SelectValue placeholder='Chart Type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='pie'>
              <div className='flex items-center'>
                <PieChart className='size-4 mr-2 shrink-0' />
                <p>Pie Chart</p>
              </div>
            </SelectItem>
            <SelectItem value='radar'>
              <div className='flex items-center'>
                <Radar className='size-4 mr-2 shrink-0' />
                <p>Radar Chart</p>
              </div>
            </SelectItem>
            <SelectItem value='radial'>
              <div className='flex items-center'>
                <Target className='size-4 mr-2 shrink-0' />
                <p>Radial Chart</p>
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
            {chartType === 'pie' && <CategorySpendingChartPieVariant data={data} />}
            {chartType === 'radar' && <CategorySpendingChartRadarVariant data={data} />}
            {chartType === 'radial' && <CategorySpendingChartRadialVariant data={data} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CategorySpendingChart;
