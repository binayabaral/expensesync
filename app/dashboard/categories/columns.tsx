'use client';

import { Check, X } from 'lucide-react';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'next/navigation';
import { endOfDay, format, parse, startOfDay, startOfMonth, subMonths } from 'date-fns';

import { client } from '@/lib/hono';
import { cn, formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SortableHeader } from '@/components/SortableHeader';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<(typeof client.api.categories)['with-expenses']['$get'], 200>['data'][0];

export type EditingValues = { name: string };

export type CategoryTableMeta = {
  editingRowId: string | null;
  editingValues: EditingValues | null;
  updateEditingValues: (patch: Partial<EditingValues>) => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  startEditingById: (id: string, values: EditingValues) => void;
  isSaving: boolean;
};

export function buildEditingValues(t: ResponseType): EditingValues {
  return { name: t.name };
}

const formatDateRange = (start: Date, end: Date): string => {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameYear && sameMonth) {
    return `${format(start, 'MMM dd')} - ${format(end, 'dd')}`;
  } else if (sameYear) {
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
  } else {
    return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
  }
};

export const getBaseColumns = (startDate: Date, endDate: Date): ColumnDef<ResponseType>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} label='Name' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as CategoryTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-40'>
            <Input
              value={meta.editingValues.name}
              onChange={e => meta.updateEditingValues({ name: e.target.value })}
              disabled={meta.isSaving}
              placeholder='e.g. Food, Travel, etc.'
            />
          </div>
        );
      }

      return (
        <span className={cn('whitespace-nowrap', row.original.amount < (row.original.prevAmounts?.[0] ?? 0) ? 'text-destructive' : 'text-primary')}>
          {row.original.name}
        </span>
      );
    },
    footer: () => <span className='text-muted-foreground'>Totals</span>
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <SortableHeader column={column} label={formatDateRange(startDate, endDate)} />,
    cell: ({ row }) => (
      <span className={cn('whitespace-nowrap', row.original.amount < (row.original.prevAmounts?.[0] ?? 0) ? 'text-destructive' : 'text-primary')}>
        {formatCurrency(row.original.amount)}
      </span>
    ),
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce(
        (acc, row) => {
          if (row.original.amount >= 0) {
            acc.income += row.original.amount;
          } else {
            acc.expense += row.original.amount;
          }
          return acc;
        },
        { income: 0, expense: 0 }
      );
      const prevTotal = table.getPreFilteredRowModel().rows.reduce(
        (acc, row) => {
          const prevAmount = row.original.prevAmounts?.[0] ?? 0;
          if (prevAmount >= 0) {
            acc.income += prevAmount;
          } else {
            acc.expense += prevAmount;
          }
          return acc;
        },
        { income: 0, expense: 0 }
      ) || total;

      return (
        <>
          <div className={cn('whitespace-nowrap', total.income === prevTotal.income ? 'text-muted-foreground' : total.income < prevTotal.income ? 'text-destructive' : 'text-primary')}>
            <span className='mr-1 inline-block min-w-8 shrink-0'>Inc:</span>
            <span className='inline-block'>{formatCurrency(total.income)}</span>
          </div>
          <div className={cn('whitespace-nowrap', total.expense === prevTotal.expense ? 'text-muted-foreground' : total.expense < prevTotal.expense ? 'text-destructive' : 'text-primary')}>
            <span className='mr-1 inline-block min-w-8 shrink-0'>Exp:</span>
            <span className='inline-block'>{formatCurrency(total.expense)}</span>
          </div>
          <div className={cn('whitespace-nowrap', total.income + total.expense === prevTotal.income + prevTotal.expense ? 'text-muted-foreground' : total.income + total.expense < prevTotal.income + prevTotal.expense ? 'text-destructive' : 'text-primary')}>
            <span className='mr-1 inline-block min-w-8 shrink-0'>Net:</span>
            <span className='inline-block'>{formatCurrency(total.income + total.expense)}</span>
          </div>
        </>
      );
    }
  }
];

export const BuildColumns = (data: ResponseType[]): ColumnDef<ResponseType>[] => {
  const params = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const today = new Date();
  const defaultTo = endOfDay(today);
  const defaultFrom = startOfMonth(today);

  const startDate = from ? startOfDay(parse(from, 'yyyy-MM-dd', new Date())) : defaultFrom;
  const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

  const maxPeriods = Math.max(...data.map(d => d.prevAmounts?.length ?? 0), 0);

  const prevColumns: ColumnDef<ResponseType>[] = Array.from({ length: maxPeriods }).map((_, i) => ({
    id: `prev-${i}`,
    header: ({ column }) => (
      <SortableHeader column={column} label={formatDateRange(subMonths(startDate, i + 1), subMonths(endDate, i + 1))} />
    ),
    cell: ({ row }) => {
      const value = row.original.prevAmounts?.[i] ?? 0;
      const prevValue = row.original.prevAmounts?.[i + 1] ?? value;
      return (
        <span className={cn('whitespace-nowrap', value < prevValue ? 'text-destructive' : value === prevValue ? 'text-muted-foreground' : 'text-primary')}>
          {value != null ? formatCurrency(value) : '-'}
        </span>
      );
    },
    footer: ({ table }) => {
      const total = table.getFilteredRowModel().rows.reduce(
        (acc, row) => {
          const val = row.original.prevAmounts?.[i] ?? 0;
          if (val >= 0) { acc.income += val; } else { acc.expense += val; }
          return acc;
        },
        { income: 0, expense: 0 }
      );
      const prevTotal = table.getPreFilteredRowModel().rows.reduce(
        (acc, row) => {
          const prevVal = row.original.prevAmounts?.[i + 1] ?? row.original.prevAmounts?.[i] ?? 0;
          if (prevVal >= 0) { acc.income += prevVal; } else { acc.expense += prevVal; }
          return acc;
        },
        { income: 0, expense: 0 }
      ) || total;

      return (
        <>
          <div className={cn('whitespace-nowrap', total.income === prevTotal.income ? 'text-muted-foreground' : total.income < prevTotal.income ? 'text-destructive' : 'text-primary')}>
            <span className='mr-1 inline-block min-w-8 shrink-0'>Inc:</span>
            <span className='inline-block'>{formatCurrency(total.income)}</span>
          </div>
          <div className={cn('whitespace-nowrap', total.expense === prevTotal.expense ? 'text-muted-foreground' : total.expense < prevTotal.expense ? 'text-destructive' : 'text-primary')}>
            <span className='mr-1 inline-block min-w-8 shrink-0'>Exp:</span>
            <span className='inline-block'>{formatCurrency(total.expense)}</span>
          </div>
          <div className={cn('whitespace-nowrap', total.income + total.expense === prevTotal.income + prevTotal.expense ? 'text-muted-foreground' : total.income + total.expense < prevTotal.income + prevTotal.expense ? 'text-destructive' : 'text-primary')}>
            <span className='mr-1 inline-block min-w-8 shrink-0'>Net:</span>
            <span className='inline-block'>{formatCurrency(total.income + total.expense)}</span>
          </div>
        </>
      );
    }
  }));

  return [
    ...getBaseColumns(startDate, endDate),
    ...prevColumns,
    {
      id: 'actions',
      cell: ({ row, table }) => {
        const meta = table.options.meta as CategoryTableMeta | undefined;
        const isEditing = meta?.editingRowId === row.original.id;

        if (isEditing) {
          return (
            <div onClick={e => e.stopPropagation()} className='flex items-center gap-1'>
              <Button size='sm' onClick={meta?.saveEditing} disabled={meta?.isSaving} className='h-8 w-8 p-0'>
                <Check className='size-4' />
              </Button>
              <Button size='sm' variant='ghost' onClick={meta?.cancelEditing} disabled={meta?.isSaving} className='h-8 w-8 p-0'>
                <X className='size-4' />
              </Button>
            </div>
          );
        }

        return (
          <div onClick={e => e.stopPropagation()}>
            <Actions
              id={row.original.id}
            />
          </div>
        );
      }
    }
  ];
};
