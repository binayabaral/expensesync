import { ColumnDef } from '@tanstack/react-table';
import { InferResponseType } from 'hono';
import { ArrowUpDown } from 'lucide-react';

import { client } from '@/lib/hono';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.assets.$get, 200>['data'][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Asset
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    )
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Type
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    )
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Quantity
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    )
  },
  {
    accessorKey: 'unit',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Unit
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    )
  },
  {
    accessorKey: 'extraCharge',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Extra Charges
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => formatCurrency(row.original.extraCharge)
  },
  {
    accessorKey: 'assetPrice',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Bought Price / Unit
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => formatCurrency(row.original.assetPrice)
  },
  {
    accessorKey: 'liveUnitPrice',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Current Price / Unit
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => (row.original.liveUnitPrice != null ? formatCurrency(row.original.liveUnitPrice) : '-')
  },
  {
    accessorKey: 'totalPaid',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Total Paid
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => formatCurrency(row.original.totalPaid)
  },
  {
    accessorKey: 'currentValue',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Current Value
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => (row.original.currentValue != null ? formatCurrency(row.original.currentValue) : '-')
  },
  {
    accessorKey: 'realizedProfitLoss',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Realized P/L
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.original.realizedProfitLoss ?? 0;

      if (!value) {
        return <span className='whitespace-nowrap text-muted-foreground'>{formatCurrency(0)}</span>;
      }

      return (
        <span
          className={cn(
            'whitespace-nowrap',
            value > 0 ? 'text-emerald-600 dark:text-emerald-400' : value < 0 ? 'text-red-600 dark:text-red-400' : ''
          )}
        >
          {formatCurrency(value)}
        </span>
      );
    }
  },
  {
    accessorKey: 'unrealizedProfitLoss',
    header: ({ column }) => (
      <Button
        variant='ghost'
        className='px-3'
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Unrealized P/L
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.original.unrealizedProfitLoss;

      if (value == null) return '-';

      return (
        <span
          className={cn(
            'whitespace-nowrap',
            value > 0 ? 'text-emerald-600 dark:text-emerald-400' : value < 0 ? 'text-red-600 dark:text-red-400' : ''
          )}
        >
          {formatCurrency(value)}
        </span>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} />
  }
];


