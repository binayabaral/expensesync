import { ColumnDef, Row } from '@tanstack/react-table';
import { InferResponseType } from 'hono';

import { client } from '@/lib/hono';
import { DEFAULT_CURRENCY, cn, formatCurrency } from '@/lib/utils';
import { SortableHeader } from '@/components/SortableHeader';
import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.assets.$get, 200>['data'][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} label='Asset' />,
    footer: () => ''
  },
  {
    accessorKey: 'type',
    header: ({ column }) => <SortableHeader column={column} label='Type' />,
    footer: () => ''
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => <SortableHeader column={column} label='Quantity' />,
    footer: () => ''
  },
  {
    accessorKey: 'unit',
    header: ({ column }) => <SortableHeader column={column} label='Unit' />,
    footer: () => ''
  },
  {
    accessorKey: 'extraCharge',
    header: ({ column }) => <SortableHeader column={column} label='Extra Charges' />,
    cell: ({ row }) => formatCurrency(row.original.extraCharge, false, row.original.accountCurrency ?? DEFAULT_CURRENCY),
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.extraCharge || 0), 0);
      return formatCurrency(total);
    }
  },
  {
    accessorKey: 'assetPrice',
    header: ({ column }) => <SortableHeader column={column} label='Bought Price / Unit' />,
    cell: ({ row }) => formatCurrency(row.original.assetPrice, false, row.original.accountCurrency ?? DEFAULT_CURRENCY),
    footer: () => ''
  },
  {
    accessorKey: 'liveUnitPrice',
    header: ({ column }) => <SortableHeader column={column} label='Current Price / Unit' />,
    cell: ({ row }) => (
      row.original.liveUnitPrice != null
        ? formatCurrency(row.original.liveUnitPrice, false, row.original.accountCurrency ?? DEFAULT_CURRENCY)
        : '-'
    ),
    footer: () => ''
  },
  {
    accessorKey: 'totalPaid',
    header: ({ column }) => <SortableHeader column={column} label='Total Paid' />,
    cell: ({ row }) => formatCurrency(row.original.totalPaid, false, row.original.accountCurrency ?? DEFAULT_CURRENCY),
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.totalPaid || 0), 0);
      return formatCurrency(total);
    }
  },
  {
    accessorKey: 'currentValue',
    header: ({ column }) => <SortableHeader column={column} label='Current Value' />,
    cell: ({ row }) => (
      row.original.currentValue != null
        ? formatCurrency(row.original.currentValue, false, row.original.accountCurrency ?? DEFAULT_CURRENCY)
        : '-'
    ),
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.currentValue || 0), 0);
      return total > 0 ? formatCurrency(total) : '-';
    }
  },
  {
    accessorKey: 'realizedProfitLoss',
    header: ({ column }) => <SortableHeader column={column} label='Realized P/L' />,
    cell: ({ row }) => {
      const value = row.original.realizedProfitLoss ?? 0;
      const currency = row.original.accountCurrency ?? DEFAULT_CURRENCY;

      if (!value) {
        return <span className='whitespace-nowrap text-muted-foreground'>{formatCurrency(0, false, currency)}</span>;
      }

      return (
        <span className={cn('whitespace-nowrap', value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
          {formatCurrency(value, false, currency)}
        </span>
      );
    },
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce((sum, row) => sum + (row.original.realizedProfitLoss || 0), 0);
      return (
        <span className={cn('whitespace-nowrap font-medium', total > 0 ? 'text-emerald-600 dark:text-emerald-400' : total < 0 ? 'text-red-600 dark:text-red-400' : '')}>
          {formatCurrency(total)}
        </span>
      );
    }
  },
  {
    accessorKey: 'unrealizedProfitLoss',
    header: ({ column }) => <SortableHeader column={column} label='Unrealized P/L' />,
    cell: ({ row }) => {
      const value = row.original.unrealizedProfitLoss;
      const currency = row.original.accountCurrency ?? DEFAULT_CURRENCY;

      if (value == null) return '-';

      return (
        <span className={cn('whitespace-nowrap', value > 0 ? 'text-emerald-600 dark:text-emerald-400' : value < 0 ? 'text-red-600 dark:text-red-400' : '')}>
          {formatCurrency(value, false, currency)}
        </span>
      );
    },
    footer: ({ table }) => {
      const rows = table.getFilteredRowModel().rows;
      const total = rows.reduce((sum, row) => sum + (row.original.unrealizedProfitLoss ?? 0), 0);
      const hasNullValues = rows.some(row => row.original.unrealizedProfitLoss == null);

      if (hasNullValues && total === 0) return '-';

      return (
        <span className={cn('whitespace-nowrap font-medium', total > 0 ? 'text-emerald-600 dark:text-emerald-400' : total < 0 ? 'text-red-600 dark:text-red-400' : '')}>
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

export function mobileRow(row: Row<ResponseType>) {
  const a = row.original;
  const currency = a.accountCurrency ?? DEFAULT_CURRENCY;
  const realizedPL = a.realizedProfitLoss ?? 0;
  const unrealizedPL = a.unrealizedProfitLoss;
  const displayValue = a.currentValue != null ? a.currentValue : a.totalPaid;

  return (
    <div className='flex items-start gap-3 px-3 py-2'>
      <div className='flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-sm font-medium'>{a.name}</span>
          <span className={cn('text-sm font-semibold shrink-0 tabular-nums', displayValue < 0 ? 'text-destructive' : 'text-primary')}>
            {formatCurrency(displayValue, false, currency)}
          </span>
        </div>
        <div className='flex flex-wrap gap-x-1 mt-0.5 text-xs text-muted-foreground'>
          <span>{a.type}</span>
          <span>· {a.quantity} {a.unit}</span>
        </div>
        <div className='mt-0.5 text-xs text-muted-foreground'>Bought: {formatCurrency(a.assetPrice, false, currency)}/{a.unit}</div>
        {a.liveUnitPrice != null && <div className='mt-0.5 text-xs text-muted-foreground'>Current: {formatCurrency(a.liveUnitPrice, false, currency)}/{a.unit}</div>}
        {a.extraCharge !== 0 && <div className='mt-0.5 text-xs text-muted-foreground'>Charges: {formatCurrency(a.extraCharge, false, currency)}</div>}
        {realizedPL !== 0 && (
          <div className={cn('mt-0.5 text-xs', realizedPL > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            Realized: {formatCurrency(realizedPL, false, currency)}
          </div>
        )}
        {unrealizedPL != null && (
          <div className={cn('mt-0.5 text-xs', unrealizedPL > 0 ? 'text-emerald-600 dark:text-emerald-400' : unrealizedPL < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            Unrealized: {formatCurrency(unrealizedPL, false, currency)}
          </div>
        )}
      </div>
      <div className='shrink-0 mt-0.5'>
        <Actions id={a.id} />
      </div>
    </div>
  );
}
