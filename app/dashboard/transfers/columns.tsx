'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { DEFAULT_CURRENCY, cn, formatCurrency } from '@/lib/utils';
import { SortableHeader } from '@/components/SortableHeader';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.transfers.$get, 200>['data'][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <SortableHeader column={column} label='Date' />,
    cell: ({ row }) => <span>{format(row.getValue('date') as Date, 'dd MMMM, yyyy hh:mm a')}</span>
  },
  {
    accessorKey: 'fromAccount',
    header: ({ column }) => <SortableHeader column={column} label='Sender Account' />,
    cell: ({ row }) => <span>{row.original.fromAccount}</span>
  },
  {
    accessorKey: 'toAccount',
    header: ({ column }) => <SortableHeader column={column} label='Receiver Account' />,
    cell: ({ row }) => <span>{row.original.toAccount}</span>
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <SortableHeader column={column} label='Amount' />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const fromCurrency = row.original.fromAccountCurrency ?? DEFAULT_CURRENCY;
      const toCurrency = row.original.toAccountCurrency ?? DEFAULT_CURRENCY;
      const toAmount = row.original.toAmount;
      const isCross = toAmount !== null && toAmount !== undefined && fromCurrency !== toCurrency;

      return (
        <span className='flex flex-col gap-0.5'>
          <span className={cn('whitespace-nowrap', amount < 0 ? 'text-destructive' : 'text-primary')}>
            {formatCurrency(amount, false, fromCurrency)}
          </span>
          {isCross && (
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              → {formatCurrency(toAmount!, false, toCurrency)}
            </span>
          )}
        </span>
      );
    }
  },
  {
    accessorKey: 'transferCharge',
    header: ({ column }) => <SortableHeader column={column} label='Extra Charges' />,
    cell: ({ row }) => {
      const charge = parseFloat(row.getValue('transferCharge'));
      const fromCurrency = row.original.fromAccountCurrency ?? DEFAULT_CURRENCY;

      return (
        <span
          className={cn(
            'whitespace-nowrap',
            charge === 0 ? 'text-muted-foreground' : charge < 0 ? 'text-primary' : 'text-destructive'
          )}
        >
          {formatCurrency(charge, false, fromCurrency)}
        </span>
      );
    }
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => <SortableHeader column={column} label='Notes' />,
    cell: ({ row }) => <span>{row.original.notes}</span>
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} />
  }
];
