'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ArrowUpDown } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { Button } from '@/components/ui/button';
import { DEFAULT_CURRENCY, cn, formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.transfers.$get, 200>['data'][0];

export const columns: ColumnDef<ResponseType>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        aria-label='Select all'
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label='Select row'
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'date',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Date
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => <span>{format(row.getValue('date') as Date, 'dd MMMM, yyyy hh:mm a')}</span>
  },
  {
    accessorKey: 'fromAccount',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Sender Account
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{row.original.fromAccount}</span>;
    }
  },
  {
    accessorKey: 'toAccount',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Receiver Account
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{row.original.toAccount}</span>;
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Amount
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
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
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Extra Charges
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
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
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Notes
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{row.original.notes}</span>;
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <Actions id={row.original.id} />
  }
];
