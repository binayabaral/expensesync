'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoanResponseType } from '@/features/loans/api/useGetLoans';

type Props = {
  loan: LoanResponseType;
};

export const ClosedLoanCard = ({ loan }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const balance = loan.currentBalance ?? 0;
  const isEmi = loan.loanSubType === 'EMI';
  const originalPrincipal = loan.originalPrincipal ?? 0;
  const amountPaid = loan.amountPaid ?? 0;
  const hasPayments = (loan.paymentHistory?.length ?? 0) > 0;

  return (
    <Card className='border border-slate-200 shadow-none opacity-75'>
      <CardHeader className='pb-0 pt-2 px-4 space-y-0'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <CardTitle className='text-sm font-semibold text-muted-foreground'>{loan.name}</CardTitle>
            <Badge variant='outline' className='text-xs text-muted-foreground'>Closed</Badge>
            {loan.loanSubType && (
              <Badge variant='secondary' className='text-xs'>
                {loan.loanSubType === 'EMI' ? 'EMI' : 'Peer'}
              </Badge>
            )}
          </div>
          {hasPayments && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 w-7 p-0 text-muted-foreground'
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className='h-3.5 w-3.5' /> : <ChevronDown className='h-3.5 w-3.5' />}
            </Button>
          )}
        </div>
        {loan.closedAt && (
          <p className='text-xs text-muted-foreground mt-0.5'>
            Archived {format(new Date(loan.closedAt), 'MMM d, yyyy')}
          </p>
        )}
      </CardHeader>
      <CardContent className='px-4 pb-2 pt-1 space-y-1'>
        <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs'>
          {isEmi ? (
            <>
              {originalPrincipal > 0 && (
                <div>
                  <span className='text-muted-foreground'>Principal: </span>
                  <span className='font-semibold'>{formatCurrency(originalPrincipal)}</span>
                </div>
              )}
              <div>
                <span className='text-muted-foreground'>Total paid: </span>
                <span className='font-semibold'>{formatCurrency(amountPaid)}</span>
              </div>
              {loan.paymentCount != null && loan.paymentCount > 0 && (
                <div>
                  <span className='text-muted-foreground'>Payments: </span>
                  <span className='font-semibold'>
                    {loan.paymentCount}{loan.totalPayments ? ` / ${loan.totalPayments}` : ''}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div>
              <span className='text-muted-foreground'>Final balance: </span>
              <span className='font-semibold'>{formatCurrency(Math.abs(balance))}</span>
            </div>
          )}
        </div>

        {expanded && hasPayments && (
          <div className='border-t pt-1.5 space-y-0.5 max-h-40 overflow-y-auto'>
            {(loan.paymentHistory ?? []).map(payment => {
              const note = payment.notes && payment.notes !== 'null' && payment.notes !== 'undefined'
                ? payment.notes
                : null;
              return (
                <div key={payment.id} className='flex items-baseline gap-2 text-xs'>
                  <span className='text-muted-foreground shrink-0 w-24'>
                    {format(new Date(payment.date), 'MMM d, yyyy')}
                  </span>
                  <span className='text-muted-foreground truncate flex-1'>{note ?? '—'}</span>
                  <span className='font-medium tabular-nums shrink-0'>{formatCurrency(payment.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
