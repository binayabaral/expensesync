import { format } from 'date-fns';

import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const HealthChartTooltip = ({ active, payload }: any) => {
  if (!active) return null;

  const date = payload[0].payload.date;
  const netWorth = payload[0].value;

  return (
    <div className='rounded-sm bg-white shadow-sm border overflow-hidden'>
      <div className='text-sm py-2 px-3 bg-muted text-muted-foreground'>{format(date, 'MMM dd yyyy')}</div>
      <Separator />
      <div className='py-2 px-3 space-y-1'>
        <div className='flex items-center justify-between gap-x-4'>
          <div className='flex items-center gap-x-2'>
            <div className='size-1.5 bg-blue-500 rounded-full' />
            <p className='text-sm text-muted-foreground'>Net Worth</p>
          </div>
          <p className='text-sm text-right font-medium'>{formatCurrency(netWorth)}</p>
        </div>
      </div>
    </div>
  );
};
