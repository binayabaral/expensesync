'use client';

import { client } from '@/lib/hono';
import { InferResponseType } from 'hono';
import { ArrowUpDown } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { DEFAULT_CURRENCY, cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.accounts.$get, 200>['data'][0];

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
        {row.original.currency && row.original.currency !== DEFAULT_CURRENCY && (
          <Badge variant='secondary' className='text-xs font-mono'>
            {row.original.currency}
          </Badge>
        )}
      </span>
    )
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Available Balance
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
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
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Type
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => (
      <span className='whitespace-nowrap text-muted-foreground'>
        {row.original.accountType
          ? row.original.accountType
              .toLowerCase()
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          : 'Cash'}
      </span>
    )
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} />
  }
];
