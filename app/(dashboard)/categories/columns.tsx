'use client';

import { InferResponseType } from 'hono';
import { ArrowUpDown } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<(typeof client.api.categories)['with-expenses']['$get'], 200>['data'][0];

export const baseColumns: ColumnDef<ResponseType>[] = [
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
        Amount (selected period)
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

export const buildColumns = (data: ResponseType[]): ColumnDef<ResponseType>[] => {
  const maxPeriods = Math.max(...data.map(d => d.prevAmounts?.length ?? 0), 0);

  const prevColumns: ColumnDef<ResponseType>[] = Array.from({ length: maxPeriods }).map((_, i) => ({
    id: `prev-${i}`,
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Amount ({i + 1} period/s ago)
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const prevValue = row.original.prevAmounts?.[i + 1] ?? 0;
      const value = row.original.prevAmounts?.[i] ?? 0;
      return (
        <span
          className={cn(
            'whitespace-nowrap',
            value > prevValue ? 'text-destructive' : value === prevValue ? '' : 'text-primary'
          )}
        >
          {value != null ? formatCurrency(value) : '-'}
        </span>
      );
    }
  }));

  return [
    ...baseColumns,
    ...prevColumns,
    {
      id: 'actions',
      cell: ({ row }) => <Actions id={row.original.id} />
    }
  ];
};
