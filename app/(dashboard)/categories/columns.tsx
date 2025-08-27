'use client';

import { InferResponseType } from 'hono';
import { ArrowUpDown } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

import { Actions } from './Actions';
import { useSearchParams } from 'next/navigation';
import { endOfDay, format, parse, startOfDay, startOfMonth, subMonths } from 'date-fns';

export type ResponseType = InferResponseType<(typeof client.api.categories)['with-expenses']['$get'], 200>['data'][0];

const formatDateRange = (start: Date, end: Date): string => {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameYear && sameMonth) {
    return `${format(start, 'MMM dd')} - ${format(end, 'dd')}`;
  } else if (sameYear) {
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
  } else {
    return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
  }
};

export const getBaseColumns = (startDate: Date, endDate: Date): ColumnDef<ResponseType>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => (
      <span
        className={cn(row.original.amount < (row.original.prevAmounts?.[0] ?? 0) ? 'text-destructive' : 'text-primary')}
      >
        {row.original.name}
      </span>
    )
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {formatDateRange(startDate, endDate)}
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          'whitespace-nowrap',
          row.original.amount < (row.original.prevAmounts?.[0] ?? 0) ? 'text-destructive' : 'text-primary'
        )}
      >
        {formatCurrency(row.original.amount)}
      </span>
    )
  }
];

export const BuildColumns = (data: ResponseType[]): ColumnDef<ResponseType>[] => {
  const params = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const today = new Date();
  const defaultTo = endOfDay(today);
  const defaultFrom = startOfMonth(today);

  const startDate = from ? startOfDay(parse(from, 'yyyy-MM-dd', new Date())) : defaultFrom;
  const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

  const maxPeriods = Math.max(...data.map(d => d.prevAmounts?.length ?? 0), 0);

  const prevColumns: ColumnDef<ResponseType>[] = Array.from({ length: maxPeriods }).map((_, i) => ({
    id: `prev-${i}`,
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {formatDateRange(subMonths(startDate, i + 1), subMonths(endDate, i + 1))}
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.original.prevAmounts?.[i] ?? 0;
      const prevValue = row.original.prevAmounts?.[i + 1] ?? value;
      return (
        <span
          className={cn(
            'whitespace-nowrap',
            value < prevValue ? 'text-destructive' : value === prevValue ? 'text-muted-foreground' : 'text-primary'
          )}
        >
          {value != null ? formatCurrency(value) : '-'}
        </span>
      );
    }
  }));

  return [
    ...getBaseColumns(startDate, endDate),
    ...prevColumns,
    {
      id: 'actions',
      cell: ({ row }) => <Actions id={row.original.id} />
    }
  ];
};
