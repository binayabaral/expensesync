'use client';

import { format } from 'date-fns';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, TriangleAlert } from 'lucide-react';

import { client } from '@/lib/hono';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

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
    cell: ({ row }) => <span>{format(row.getValue('date') as Date, 'dd MMMM, yyyy HH:mm')}</span>
  },
  {
    accessorKey: 'category',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Category
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
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
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Payee
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
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

      return (
        <span className={cn('whitespace-nowrap', amount < 0 ? 'text-destructive' : 'text-primary')}>
          {formatCurrency(amount)}
        </span>
      );
    }
  },
  {
    accessorKey: 'account',
    header: ({ column }) => {
      return (
        <Button variant='ghost' className='px-3' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Account
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span>{row.original.account}</span>;
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
    cell: ({ row }) => <Actions id={row.original.id} isDisabled={row.original.type !== 'USER_CREATED'} />
  }
];
