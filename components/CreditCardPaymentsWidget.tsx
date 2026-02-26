'use client';

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatRemainingTime } from '@/lib/utils';
import { useGetCreditCards } from '@/features/credit-cards/api/useGetCreditCards';

export const CreditCardPaymentsWidget = () => {
  const { data = [], isLoading } = useGetCreditCards();

  const upcoming = data
    .filter(card => card.nextStatement)
    .sort((a, b) => {
      if (!a.nextStatement || !b.nextStatement) {
        return 0;
      }
      return new Date(a.nextStatement.dueDate).getTime() - new Date(b.nextStatement.dueDate).getTime();
    });

  return (
    <Card className='border border-slate-200 shadow-none'>
      <CardHeader>
        <CardTitle className='text-lg font-semibold'>Credit Card Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='h-32 w-full flex items-center justify-center'>
            <Loader2 className='size-6 text-slate-300 animate-spin' />
          </div>
        ) : upcoming.length === 0 ? (
          <div className='text-sm text-muted-foreground'>No upcoming credit card payments.</div>
        ) : (
          <div className='space-y-4'>
            {upcoming.map(card => (
              (() => {
                const statement = card.nextStatement;
                if (!statement) {
                  return null;
                }

                return (
                  <div key={card.id} className='rounded-md border border-slate-200 p-3'>
                    <div className='flex items-center justify-between'>
                      <div className='font-medium'>{card.name}</div>
                      <div className='text-xs text-muted-foreground'>
                        Due {format(new Date(statement.dueDate), 'MMM dd')}
                      </div>
                    </div>
                    <div className='mt-2 flex items-center justify-between text-sm'>
                      <div>
                        Payment Due: <span className='font-medium'>{formatCurrency(statement.paymentDueAmount)}</span>
                      </div>
                      <div className={(statement.daysUntilDue ?? 0) < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                        {formatRemainingTime((statement.daysUntilDue ?? 0), new Date(statement.dueDate))}
                      </div>
                    </div>
                    <div className='mt-1 text-xs text-muted-foreground'>
                      Statement: {formatCurrency(statement.statementBalance)} · Minimum: {formatCurrency(statement.minimumPayment)}
                    </div>
                  </div>
                );
              })()
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
