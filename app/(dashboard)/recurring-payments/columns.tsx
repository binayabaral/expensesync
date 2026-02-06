'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

import { client } from '@/lib/hono';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<
  (typeof client.api)['recurring-payments']['$get'],
  200
>['data'][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    )
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Type
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    )
  },
  {
    accessorKey: 'cadence',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Cadence
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    )
  },
  {
    accessorKey: 'nextDueDate',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Next Due
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.original.nextDueDate ? new Date(row.original.nextDueDate) : null;
      return value ? <span>{format(value, 'dd MMM, yyyy')}</span> : <span>N/A</span>;
    }
  },
  {
    accessorKey: 'daysRemaining',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Days Left
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const days = row.original.daysRemaining ?? 0;
      const isYearly = row.original.cadence === 'YEARLY';
      const warningThreshold = isYearly ? 30 : 10;

      if (days < 0) {
        return <span className='text-destructive'>Overdue by {Math.abs(days)} days</span>;
      }

      const tone = days <= warningThreshold ? 'fill-yellow-500' : 'text-primary';

      return <span className={cn(tone)}>{days} days</span>;
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Amount
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0;
      return <span className={cn('whitespace-nowrap')}>{formatCurrency(amount)}</span>;
    }
  },
  {
    id: 'account',
    header: 'Account',
    cell: ({ row }) => {
      if (row.original.type === 'TRANSFER') {
        const from = row.original.account || 'N/A';
        const to = row.original.toAccount || 'N/A';
        return (
          <span>
            {from} &rarr; {to}
          </span>
        );
      }

      return <span>{row.original.account || 'N/A'}</span>;
    }
  },
  {
    id: 'category',
    header: 'Category',
    cell: ({ row }) => {
      if (row.original.type !== 'TRANSACTION') {
        return <span>N/A</span>;
      }
      return <span>{row.original.category || 'Uncategorized'}</span>;
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions item={row.original} />
  }
];
