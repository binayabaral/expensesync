'use client';

import qs from 'query-string';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth } from 'date-fns';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { formatDateRange } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function FilterDate() {
  const router = useRouter();
  const pathname = usePathname();

  const params = useSearchParams();
  const to = params.get('to') || '';
  const from = params.get('from') || '';
  const accountId = params.get('accountId') || 'all';

  const defaultTo = new Date();
  const defaultFrom = startOfMonth(defaultTo);

  const paramState = {
    from: from ? new Date(from) : defaultFrom,
    to: to ? new Date(to) : defaultTo
  };

  const [date, setDate] = useState<DateRange | undefined>(paramState);

  const pushToUrl = (dateRange: DateRange | undefined) => {
    const query = {
      accountId: accountId === 'all' ? '' : accountId,
      from: format(dateRange?.from || defaultFrom, 'yyyy-MM-dd'),
      to: format(dateRange?.to || defaultTo, 'yyyy-MM-dd')
    };
    const url = qs.stringifyUrl({ url: pathname, query }, { skipNull: true, skipEmptyString: true });
    router.push(url);
  };

  const onReset = () => {
    setDate(undefined);
    pushToUrl(undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          disabled={false}
          size='sm'
          variant='outline'
          className='w-full lg:w-auto h-9 rounded-md px-3 font-normal bg-primary/10 hover:bg-primary/20 hover:text-primary border-none focus:ring-offset-0 focus:ring-transparent outline-none text-primary transition'
        >
          <span>{formatDateRange(paramState)}</span>
          <ChevronDown className='ml-2 size-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-full lg:w-auto p-0' align='start'>
        <Calendar
          disabled={false}
          mode='range'
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
        />
        <div className='p-4 w-full flex items-center gap-x-2'>
          <PopoverClose asChild>
            <Button onClick={onReset} disabled={!date?.from || !date?.to} className='w-full' variant='outline'>
              Reset
            </Button>
          </PopoverClose>
          <PopoverClose asChild>
            <Button onClick={() => pushToUrl(date)} disabled={!date?.from || !date?.to} className='w-full'>
              Apply
            </Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default FilterDate;
