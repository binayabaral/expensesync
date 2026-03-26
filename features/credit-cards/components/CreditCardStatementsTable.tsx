import { useMemo } from 'react';
import { format } from 'date-fns';
import { ColumnDef, Row } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const renderMobileRow = (row: Row<Statement>) => {
    const s = row.original;
    return (
      <div className='flex items-start gap-3 px-3 py-2'>
        <div className='flex-1'>
          <div className='flex items-baseline justify-between gap-2'>
            <span className='text-sm font-semibold tabular-nums'>{formatCurrency(s.statementBalance)}</span>
            <Badge variant={s.isPaid ? 'secondary' : 'outline'} className={cn('text-xs shrink-0', !s.isPaid && 'text-yellow-600 border-yellow-400')}>
              {s.isPaid ? 'Paid' : 'Open'}
            </Badge>
          </div>
          <div className='flex flex-wrap gap-x-1 mt-0.5 text-xs text-muted-foreground'>
            <span>Statement {format(new Date(s.statementDate), 'dd MMMM, yyyy')}</span>
            <span>· Due {format(new Date(s.dueDate), 'dd MMMM, yyyy')}</span>
          </div>
          <div className='flex flex-wrap gap-x-1 mt-0.5 text-xs text-muted-foreground'>
            <span>Payment {formatCurrency(s.paymentDueAmount)}{s.isPaymentDueOverridden ? ' (override)' : ''}</span>
            <span>· Min {formatCurrency(s.minimumPayment)}</span>
          </div>
          <div className='mt-0.5 text-xs text-muted-foreground'>
            <span>Paid {formatCurrency(s.paidAmount)}</span>
          </div>
        </div>
        {!s.isPaid && (
          <div className='shrink-0 mt-0.5'>
            <Button variant='outline' size='sm' className='h-6 text-xs px-2' onClick={() => onOverride(s)}>
              Override
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='flex flex-col'>
      <DataTable columns={columns} data={statements} renderMobileRow={renderMobileRow} />
    </div>
  );
};
