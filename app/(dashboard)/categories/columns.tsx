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

export const columns: ColumnDef<ResponseType>[] = [
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
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Name
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className={cn(row.original.amount < row.original.prevAmount ? 'text-destructive' : 'text-primary')}>
        {row.original.name}
      </span>
    )
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Amount (selected period)
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span
        className={cn(
          'whitespace-nowrap',
          row.original.amount < row.original.prevAmount ? 'text-destructive' : 'text-primary'
        )}
      >
        {formatCurrency(row.original.amount)}
      </span>
    )
  },
  {
    accessorKey: 'prevAmount',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Amount (previous period)
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span
        className={cn(
          'whitespace-nowrap',
          row.original.amount < row.original.prevAmount ? 'text-destructive' : 'text-primary'
        )}
      >
        {formatCurrency(row.original.prevAmount)}
      </span>
    )
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} />
  }
];
