import { useMemo } from 'react';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { SortableHeader } from '@/components/SortableHeader';
import { formatCurrency } from '@/lib/utils';

type Statement = {
  id: string;
  accountId: string;
  periodStart: string | Date;
  statementDate: string | Date;
  dueDate: string | Date;
  statementBalance: number;
  paymentDueAmount: number;
  minimumPayment: number;
  paidAmount: number;
  isPaid: boolean;
  isPaymentDueOverridden?: boolean;
};

type Props = {
  statements: Statement[];
  onOverride: (statement: Statement) => void;
};

export const CreditCardStatementsTable = ({ statements, onOverride }: Props) => {
  const columns = useMemo<ColumnDef<Statement>[]>(
    () => [
      {
        accessorKey: 'statementDate',
        header: ({ column }) => <SortableHeader column={column} label='Statement Date' />,
        cell: ({ row }) => format(new Date(row.original.statementDate), 'MMM dd, yyyy')
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <SortableHeader column={column} label='Due Date' />,
        cell: ({ row }) => format(new Date(row.original.dueDate), 'MMM dd, yyyy')
      },
      {
        accessorKey: 'statementBalance',
        header: ({ column }) => <SortableHeader column={column} label='Statement Balance' />,
        cell: ({ row }) => formatCurrency(row.original.statementBalance)
      },
      {
        accessorKey: 'paymentDueAmount',
        header: ({ column }) => <SortableHeader column={column} label='Payment Due' />,
        cell: ({ row }) =>
          `${formatCurrency(row.original.paymentDueAmount)}${row.original.isPaymentDueOverridden ? ' (override)' : ''}`
      },
      {
        accessorKey: 'minimumPayment',
        header: ({ column }) => <SortableHeader column={column} label='Minimum' />,
        cell: ({ row }) => formatCurrency(row.original.minimumPayment)
      },
      {
        accessorKey: 'paidAmount',
        header: ({ column }) => <SortableHeader column={column} label='Paid' />,
        cell: ({ row }) => formatCurrency(row.original.paidAmount)
      },
      {
        accessorKey: 'isPaid',
        header: ({ column }) => <SortableHeader column={column} label='Status' />,
        cell: ({ row }) => (row.original.isPaid ? 'Paid' : 'Open')
      },
      {
        id: 'actions',
        cell: ({ row }) =>
          !row.original.isPaid ? (
            <div className='text-right'>
              <Button variant='outline' size='sm' onClick={() => onOverride(row.original)}>
                Override
              </Button>
            </div>
          ) : null
      }
    ],
    [onOverride]
  );

  return (
    <div className='h-100 flex flex-col'>
      <DataTable columns={columns} data={statements} />
    </div>
  );
};
