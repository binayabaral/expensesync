import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Statement Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Statement Balance</TableHead>
            <TableHead>Payment Due</TableHead>
            <TableHead>Minimum</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className='h-24 text-center'>
                No statements yet.
              </TableCell>
            </TableRow>
          ) : (
            statements.map(statement => (
              <TableRow key={statement.id}>
                <TableCell>{format(new Date(statement.statementDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{format(new Date(statement.dueDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{formatCurrency(statement.statementBalance)}</TableCell>
                <TableCell>
                  {formatCurrency(statement.paymentDueAmount)}
                  {statement.isPaymentDueOverridden ? ' (override)' : ''}
                </TableCell>
                <TableCell>{formatCurrency(statement.minimumPayment)}</TableCell>
                <TableCell>{formatCurrency(statement.paidAmount)}</TableCell>
                <TableCell>{statement.isPaid ? 'Paid' : 'Open'}</TableCell>
                <TableCell className='text-right'>
                  {!statement.isPaid && (
                    <Button variant='outline' size='sm' onClick={() => onOverride(statement)}>
                      Override
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
