'use client';

import { InferResponseType } from 'hono';
import { ArrowUpDown } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

import { useSearchParams } from 'next/navigation';
import { endOfDay, format, parse, startOfDay, startOfMonth, subMonths } from 'date-fns';

export type ResponseType = InferResponseType<(typeof client.api.payees)['with-expenses']['$get'], 200>['data'][0];

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
    accessorKey: 'payee',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Payee
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => (
      <span
        className={cn(row.original.amount < (row.original.prevAmounts?.[0] ?? 0) ? 'text-destructive' : 'text-primary')}
      >
        {row.original.payee}
      </span>
    ),
    footer: () => <span className='text-muted-foreground'>Totals</span>
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {formatDateRange(startDate, endDate)}
        <ArrowUpDown className='ml-2 h-4 w-4' />
      </Button>
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          'whitespace-nowrap',
          row.original.amount < (row.original.prevAmounts?.[0] ?? 0) ? 'text-destructive' : 'text-primary'
        )}
      >
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
      const prevTotal =
        table.getPreFilteredRowModel().rows.reduce(
          (acc, row) => {
            const prevVal = row.original.prevAmounts?.[0] ?? 0;
            if (prevVal >= 0) {
              acc.income += prevVal;
            } else {
              acc.expense += prevVal;
            }

            return acc;
          },
          { income: 0, expense: 0 }
        ) || { income: 0, expense: 0 };

      return (
        <>
          <div
            className={cn(
              total.income === prevTotal.income
                ? 'text-muted-foreground'
                : total.income < prevTotal.income
                ? 'text-destructive'
                : 'text-primary'
            )}
          >
            <span className='mr-1 inline-block min-w-8'>Inc:</span>
            <span className='inline-block'>{formatCurrency(total.income)}</span>
          </div>
          <div
            className={cn(
              total.expense === prevTotal.expense
                ? 'text-muted-foreground'
                : total.expense < prevTotal.expense
                ? 'text-destructive'
                : 'text-primary'
            )}
          >
            <span className='mr-1 inline-block min-w-8'>Exp:</span>
            <span className='inline-block'>{formatCurrency(total.expense)}</span>
          </div>
          <div
            className={cn(
              total.income + total.expense === prevTotal.income + prevTotal.expense
                ? 'text-muted-foreground'
                : total.income + total.expense < prevTotal.income + prevTotal.expense
                ? 'text-destructive'
                : 'text-primary'
            )}
          >
            <span className='mr-1 inline-block min-w-8'>Net:</span>
            <span className='inline-block'>{formatCurrency(total.income + total.expense)}</span>
          </div>
        </>
      );
    }
  }
];

export const BuildColumns = (payees: ResponseType[]) => {
  const params = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const today = new Date();
  const defaultTo = endOfDay(today);
  const defaultFrom = startOfMonth(today);

  const startDate = from ? startOfDay(parse(from, 'yyyy-MM-dd', new Date())) : defaultFrom;
  const endDate = to ? endOfDay(parse(to, 'yyyy-MM-dd', new Date())) : defaultTo;

  const maxPrevPeriods = Math.max(...payees.map(c => c.prevAmounts?.length || 0));

  const prevColumns: ColumnDef<ResponseType>[] = Array.from({ length: maxPrevPeriods }).map((_, i) => {
    const offset = i + 1;
    const periodStart = subMonths(startDate, offset);
    const periodEnd = subMonths(endDate, offset);

    return {
      accessorKey: `prevAmounts.${i}`,
      header: ({ column }) => (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          {formatDateRange(periodStart, periodEnd)}
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.original.prevAmounts?.[i] ?? 0;
        const prevValue = row.original.prevAmounts?.[i + 1] ?? 0;

        return (
          <span
            className={cn(
              'whitespace-nowrap',
              value < prevValue ? 'text-destructive' : value === prevValue ? 'text-muted-foreground' : 'text-primary'
            )}
          >
            {value != null ? formatCurrency(value) : '-'}
          </span>
        );
      },
      footer: ({ table }) => {
        const total = table.getFilteredRowModel().rows.reduce(
          (acc, row) => {
            const val = row.original.prevAmounts?.[i] ?? 0;
            if (val >= 0) {
              acc.income += val;
            } else {
              acc.expense += val;
            }

            return acc;
          },
          { income: 0, expense: 0 }
        );
        const prevTotal =
          table.getPreFilteredRowModel().rows.reduce(
            (acc, row) => {
              const prevVal = row.original.prevAmounts?.[i + 1] ?? row.original.prevAmounts?.[i] ?? 0;
              if (prevVal >= 0) {
                acc.income += prevVal;
              } else {
                acc.expense += prevVal;
              }

              return acc;
            },
            { income: 0, expense: 0 }
          ) || { income: 0, expense: 0 };

        return (
          <>
            <div
              className={cn(
                total.income === prevTotal.income
                  ? 'text-muted-foreground'
                  : total.income < prevTotal.income
                  ? 'text-destructive'
                  : 'text-primary'
              )}
            >
              <span className='mr-1 inline-block min-w-8'>Inc:</span>
              <span className='inline-block'>{formatCurrency(total.income)}</span>
            </div>
            <div
              className={cn(
                total.expense === prevTotal.expense
                  ? 'text-muted-foreground'
                  : total.expense < prevTotal.expense
                  ? 'text-destructive'
                  : 'text-primary'
              )}
            >
              <span className='mr-1 inline-block min-w-8'>Exp:</span>
              <span className='inline-block'>{formatCurrency(total.expense)}</span>
            </div>
            <div
              className={cn(
                total.income + total.expense === prevTotal.income + prevTotal.expense
                  ? 'text-muted-foreground'
                  : total.income + total.expense < prevTotal.income + prevTotal.expense
                  ? 'text-destructive'
                  : 'text-primary'
              )}
            >
              <span className='mr-1 inline-block min-w-8'>Net:</span>
              <span className='inline-block'>{formatCurrency(total.income + total.expense)}</span>
            </div>
          </>
        );
      }
    };
  });

  return [...getBaseColumns(startDate, endDate), ...prevColumns];
};
