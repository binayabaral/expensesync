'use client';

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatRemainingTime } from '@/lib/utils';
import { useGetCreditCards } from '@/features/credit-cards/api/useGetCreditCards';

const getUtilizationTone = (value?: number | null) => {
  if (value === null || value === undefined) {
    return 'bg-muted';
  }
  if (value <= 0.3) {
    return 'bg-emerald-500';
  }
  if (value <= 0.7) {
    return 'bg-amber-500';
  }
  return 'bg-rose-500';
};

export const CreditCardCombinedWidget = () => {
  const { data = [], isLoading } = useGetCreditCards();

  const upcoming = data
    .filter(card => card.nextStatement)
    .sort((a, b) => {
      if (!a.nextStatement || !b.nextStatement) return 0;
      return new Date(a.nextStatement.dueDate).getTime() - new Date(b.nextStatement.dueDate).getTime();
    });

  const totals = data.reduce(
    (acc, card) => {
      acc.limit += card.creditLimit ?? 0;
      acc.owed += card.currentOwed ?? 0;
      return acc;
    },
    { limit: 0, owed: 0 }
  );

  const overallUtilization = totals.limit > 0 ? totals.owed / totals.limit : null;

  if (isLoading) {
    return (
      <Card className='border border-border shadow-none'>
        <CardHeader className='pb-3'>
          <Skeleton className='h-7 w-28' />
        </CardHeader>
        <CardContent>
          <div className='w-full h-75 flex items-center justify-center'>
            <Loader2 className='h-6 w-6 text-muted-foreground animate-spin' />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border border-border shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base font-semibold'>Credit Cards</CardTitle>
      </CardHeader>
      <CardContent className='pt-0 space-y-4'>
        <>
          <div>
              <div className='text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2'>Payments</div>
              {upcoming.length === 0 ? (
                <div className='text-xs text-muted-foreground'>No upcoming payments.</div>
              ) : (
                <div className='space-y-2'>
                  {upcoming.map(card => {
                    const statement = card.nextStatement;
                    if (!statement) return null;
                    return (
                      <div key={card.id} className='flex items-center justify-between rounded border border-border px-3 py-2 text-xs'>
                        <div>
                          <span className='font-medium'>{card.name}</span>
                          <span className='text-muted-foreground ml-2'>Due {format(new Date(statement.dueDate), 'MMM dd')}</span>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          <span className='font-medium'>{formatCurrency(statement.paymentDueAmount)}</span>
                          <span className={cn('text-muted-foreground', (statement.daysUntilDue ?? 0) < 0 && 'text-destructive')}>
                            {formatRemainingTime((statement.daysUntilDue ?? 0), new Date(statement.dueDate))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className='border-t border-border pt-3'>
              <div className='text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2'>Utilization</div>
              {data.length === 0 ? (
                <div className='text-xs text-muted-foreground'>No credit cards available.</div>
              ) : (
                <div className='space-y-3'>
                  <div>
                    <div className='flex items-center justify-between text-xs mb-1.5'>
                      <span>Overall</span>
                      <span className='text-muted-foreground'>
                        {overallUtilization !== null ? `${Math.round(overallUtilization * 100)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className='h-1.5 w-full rounded-full bg-muted'>
                      <div
                        className={cn('h-1.5 rounded-full transition-all', getUtilizationTone(overallUtilization))}
                        style={{ width: overallUtilization ? `${Math.min(overallUtilization * 100, 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                  {data.map(card => (
                    <div key={card.id}>
                      <div className='flex items-center justify-between text-xs mb-1.5'>
                        <span>{card.name}</span>
                        <span className='text-muted-foreground'>
                          {card.utilization !== null ? `${Math.round(card.utilization * 100)}%` : 'N/A'}
                          <span className='ml-1.5'>· Owed {formatCurrency(card.currentOwed)}</span>
                        </span>
                      </div>
                      <div className='h-1.5 w-full rounded-full bg-muted'>
                        <div
                          className={cn('h-1.5 rounded-full transition-all', getUtilizationTone(card.utilization))}
                          style={{ width: card.utilization ? `${Math.min(card.utilization * 100, 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </>
      </CardContent>
    </Card>
  );
};
