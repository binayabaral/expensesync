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
    ),
    footer: () => ''
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
    ),
    footer: () => ''
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
    ),
    footer: () => ''
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
    ),
    footer: () => ''
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
    cell: ({ row }) => formatCurrency(row.original.extraCharge),
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.extraCharge || 0), 0);
      return formatCurrency(total);
    }
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
    cell: ({ row }) => formatCurrency(row.original.assetPrice),
    footer: () => ''
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
    cell: ({ row }) => (row.original.liveUnitPrice != null ? formatCurrency(row.original.liveUnitPrice) : '-'),
    footer: () => ''
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
    cell: ({ row }) => formatCurrency(row.original.totalPaid),
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.totalPaid || 0), 0);
      return formatCurrency(total);
    }
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
    cell: ({ row }) => (row.original.currentValue != null ? formatCurrency(row.original.currentValue) : '-'),
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.currentValue || 0), 0);
      return total > 0 ? formatCurrency(total) : '-';
    }
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
    },
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.realizedProfitLoss || 0), 0);
      return (
        <span
          className={cn(
            'whitespace-nowrap font-medium',
            total > 0 ? 'text-emerald-600 dark:text-emerald-400' : total < 0 ? 'text-red-600 dark:text-red-400' : ''
          )}
        >
          {formatCurrency(total)}
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
    },
    footer: ({ table }) => {
      const rows = table.getFilteredRowModel().rows;
      const total = rows.reduce((sum, row) => {
        const value = row.original.unrealizedProfitLoss;
        return sum + (value != null ? value : 0);
      }, 0);
      const hasNullValues = rows.some(row => row.original.unrealizedProfitLoss == null);
      
      if (hasNullValues && total === 0) return '-';
      
      return (
        <span
          className={cn(
            'whitespace-nowrap font-medium',
            total > 0 ? 'text-emerald-600 dark:text-emerald-400' : total < 0 ? 'text-red-600 dark:text-red-400' : ''
          )}
        >
          {formatCurrency(total)}
        </span>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} />,
    footer: () => ''
  }
];


