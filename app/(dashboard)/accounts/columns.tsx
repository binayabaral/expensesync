'use client';

import { client } from '@/lib/hono';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';

import { DEFAULT_CURRENCY, cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SortableHeader } from '@/components/SortableHeader';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.accounts.$get, 200>['data'][0];

const formatAccountType = (accountType: string | null): string => {
  if (!accountType) return 'Cash';
  return accountType
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
        disabled={!!row.original.isHidden}
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} label='Name' />,
    cell: ({ row }) => (
      <span className='flex items-center gap-2'>
        <span
          className={cn(
            row.original.isClosed
              ? 'text-muted-foreground'
              : row.original.isHidden
              ? 'text-muted-foreground'
              : row.original.balance < 0
              ? 'text-destructive'
              : 'text-primary'
          )}
        >
          {row.original.name}
        </span>
        {row.original.isClosed && (
          <Badge variant='outline' className='text-xs text-muted-foreground'>
            Closed
          </Badge>
        )}
        {row.original.accountType === 'BILL_SPLIT' && (
          <Badge variant='outline' className='text-xs text-muted-foreground'>
            Bill Split
          </Badge>
        )}
        {row.original.currency !== DEFAULT_CURRENCY && (
          <Badge variant='secondary' className='text-xs font-mono'>
            {row.original.currency}
          </Badge>
        )}
      </span>
    )
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => <SortableHeader column={column} label='Available Balance' />,
    cell: ({ row }) => (
      <span
        className={cn(
          'whitespace-nowrap',
          row.original.isHidden
            ? 'text-muted-foreground'
            : row.original.balance < 0
            ? 'text-destructive'
            : 'text-primary'
        )}
      >
        {formatCurrency(row.original.balance, false, row.original.currency ?? DEFAULT_CURRENCY)}
      </span>
    )
  },
  {
    accessorKey: 'accountType',
    header: ({ column }) => <SortableHeader column={column} label='Type' />,
    cell: ({ row }) => (
      <span className='whitespace-nowrap text-muted-foreground'>
        {formatAccountType(row.original.accountType)}
      </span>
    )
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} isHidden={row.original.isHidden} />
  }
];
