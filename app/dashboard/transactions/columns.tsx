'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';
import { TriangleAlert } from 'lucide-react';

import { client } from '@/lib/hono';
import { DEFAULT_CURRENCY, cn, formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { SortableHeader } from '@/components/SortableHeader';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.transactions.$get, 200>['data'][0];

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
        disabled={!!row.original.isBillSplit}
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
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
