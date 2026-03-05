'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { DEFAULT_CURRENCY, cn, formatCurrency, formatRemainingTime } from '@/lib/utils';
import { SortableHeader } from '@/components/SortableHeader';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<
  (typeof client.api)['recurring-payments']['$get'],
  200
>['data'][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} label='Name' />
  },
  {
    accessorKey: 'type',
    header: ({ column }) => <SortableHeader column={column} label='Type' />
  },
  {
    accessorKey: 'cadence',
    header: ({ column }) => <SortableHeader column={column} label='Cadence' />,
    cell: ({ row }) => {
      const cadence = row.original.cadence;
      const interval = row.original.intervalMonths ?? 1;
      if (cadence === 'MONTHLY' && interval > 1) {
        return <span>Every {interval} months</span>;
      }
      return <span>{cadence.charAt(0) + cadence.slice(1).toLowerCase()}</span>;
    }
  },
  {
    accessorKey: 'nextDueDate',
    header: ({ column }) => <SortableHeader column={column} label='Next Due' />,
    cell: ({ row }) => {
      const value = row.original.nextDueDate ? new Date(row.original.nextDueDate) : null;
      return value ? <span>{format(value, 'dd MMM, yyyy')}</span> : <span>N/A</span>;
    }
  },
  {
    accessorKey: 'daysRemaining',
    header: ({ column }) => <SortableHeader column={column} label='Days Left' />,
    cell: ({ row }) => {
      const days = row.original.daysRemaining ?? 0;
      const isYearly = row.original.cadence === 'YEARLY';
      const warningThreshold = isYearly ? 30 : 10;
      const dueDate = row.original.nextDueDate ? new Date(row.original.nextDueDate) : null;

      return (
        <span className={cn({
          'text-destructive': days < 0,
          'text-yellow-500': days >= 0 && days <= warningThreshold,
          'text-primary': days > warningThreshold
        })}>
          {formatRemainingTime(days, dueDate)}
        </span>
      );
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <SortableHeader column={column} label='Amount' />,
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0;
      const currency = row.original.accountCurrency ?? DEFAULT_CURRENCY;
      return <span className={cn('whitespace-nowrap')}>{formatCurrency(amount, false, currency)}</span>;
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
