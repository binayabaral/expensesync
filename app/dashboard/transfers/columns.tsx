'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ColumnDef, Row } from '@tanstack/react-table';

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

export function mobileRow(row: Row<ResponseType>) {
  const t = row.original;
  const amount = parseFloat(String(t.amount));
  const fromCurrency = t.fromAccountCurrency ?? DEFAULT_CURRENCY;
  const toCurrency = t.toAccountCurrency ?? DEFAULT_CURRENCY;
  const isCross = t.toAmount !== null && t.toAmount !== undefined && fromCurrency !== toCurrency;
  const charge = parseFloat(String(t.transferCharge));

  return (
    <div className='flex items-start gap-3 px-3 py-2'>
      <div className='flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-sm font-medium'>
            {t.fromAccount} → {t.toAccount}
          </span>
          <div className='text-right shrink-0'>
            <span className={cn('text-sm font-semibold tabular-nums', amount < 0 ? 'text-destructive' : 'text-primary')}>
              {formatCurrency(amount, false, fromCurrency)}
            </span>
            {isCross && (
              <div className='text-xs text-muted-foreground tabular-nums'>
                → {formatCurrency(t.toAmount!, false, toCurrency)}
              </div>
            )}
          </div>
        </div>
        <div className='flex flex-wrap gap-x-1 mt-0.5 text-xs text-muted-foreground'>
          {t.notes && <span>{t.notes}</span>}
          {charge !== 0 && (
            <span className={cn(charge < 0 ? 'text-primary' : 'text-destructive')}>
              {t.notes ? '· ' : ''}{formatCurrency(charge, false, fromCurrency)} charges
            </span>
          )}
          {charge === 0 && !t.notes && <span>—</span>}
        </div>
        <div className='mt-0.5 text-xs text-muted-foreground'>
          {format(new Date(t.date), 'dd MMMM, yyyy hh:mm a')}
        </div>
      </div>
      <div className='shrink-0 mt-0.5'>
        <Actions id={t.id} />
      </div>
    </div>
  );
}
