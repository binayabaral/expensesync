'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ColumnDef, Row } from '@tanstack/react-table';
import { TriangleAlert } from 'lucide-react';

import { client } from '@/lib/hono';
import { DEFAULT_CURRENCY, cn, formatCurrency } from '@/lib/utils';
import { SortableHeader } from '@/components/SortableHeader';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.transactions.$get, 200>['data'][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <SortableHeader column={column} label='Date' />,
    cell: ({ row }) => <span>{format(row.getValue('date') as Date, 'dd MMMM, yyyy hh:mm a')}</span>
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <SortableHeader column={column} label='Category' />,
    cell: ({ row }) => (
      <div>
        {row.original.type !== 'USER_CREATED' ? (
          <span>N/A</span>
        ) : row.original.category ? (
          <span>{row.original.category}</span>
        ) : (
          <span className='flex items-center text-destructive'>
            <TriangleAlert className='size-4 mr-2' />
            Not Categorized
          </span>
        )}
      </div>
    )
  },
  {
    accessorKey: 'payee',
    header: ({ column }) => <SortableHeader column={column} label='Payee' />
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <SortableHeader column={column} label='Amount' />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const currency = row.original.accountCurrency ?? DEFAULT_CURRENCY;

      return (
        <span className={cn('whitespace-nowrap', amount < 0 ? 'text-destructive' : 'text-primary')}>
          {formatCurrency(amount, false, currency)}
        </span>
      );
    }
  },
  {
    accessorKey: 'account',
    header: ({ column }) => <SortableHeader column={column} label='Account' />,
    cell: ({ row }) => <span>{row.original.account}</span>
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => <SortableHeader column={column} label='Notes' />,
    cell: ({ row }) => <span>{row.original.notes}</span>
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} isDisabled={row.original.type !== 'USER_CREATED' || !!row.original.isBillSplit} />
  }
];

export function mobileRow(row: Row<ResponseType>) {
  const t = row.original;
  const amount = parseFloat(String(t.amount));
  const currency = t.accountCurrency ?? DEFAULT_CURRENCY;

  return (
    <div className='flex items-start gap-3 px-3 py-2'>
      <div className='flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-sm font-medium'>{t.payee || '—'}</span>
          <span className={cn('text-sm font-semibold shrink-0 tabular-nums', amount < 0 ? 'text-destructive' : 'text-primary')}>
            {formatCurrency(amount, false, currency)}
          </span>
        </div>
        <div className='flex flex-wrap gap-x-1 mt-0.5 text-xs text-muted-foreground'>
          {t.account && <span>{t.account}</span>}
          {t.type !== 'USER_CREATED' ? (
            <span>· N/A</span>
          ) : t.category ? (
            <span>· {t.category}</span>
          ) : (
            <span className='flex items-center gap-0.5 text-destructive'>
              · <TriangleAlert className='size-3' /> Uncategorized
            </span>
          )}
        </div>
        <div className='mt-0.5 text-xs text-muted-foreground'>
          {format(new Date(t.date), 'dd MMMM, yyyy hh:mm a')}
        </div>
      </div>
      <div className='shrink-0 mt-0.5'>
        <Actions id={t.id} isDisabled={t.type !== 'USER_CREATED' || !!t.isBillSplit} />
      </div>
    </div>
  );
}
