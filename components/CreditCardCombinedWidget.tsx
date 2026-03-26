'use client';

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatRemainingTime } from '@/lib/utils';
import { useGetCreditCards } from '@/features/credit-cards/api/useGetCreditCards';
import { useGetRecurringPayments } from '@/features/recurring-payments/api/useGetRecurringPayments';

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
  const { data: recurringPayments = [], isLoading: isLoadingRecurring } = useGetRecurringPayments();

  type PaymentItem =
    | { kind: 'card'; id: string; name: string; dueDate: Date; amount: number; days: number }
    | { kind: 'recurring'; id: string; name: string; dueDate: Date | null; amount: number; days: number };

  const cardItems: PaymentItem[] = data
    .filter(card => card.nextStatement)
    .map(card => ({
      kind: 'card' as const,
      id: card.id,
      name: card.name,
      dueDate: new Date(card.nextStatement!.dueDate),
      amount: card.nextStatement!.paymentDueAmount,
      days: card.nextStatement!.daysUntilDue ?? 0
    }));

  const recurringItems: PaymentItem[] = recurringPayments
    .filter(p => {
      const days = p.daysRemaining ?? 0;
      const threshold = p.cadence === 'YEARLY' ? 30 : 10;
      return days >= 0 && days <= threshold;
    })
    .map(p => ({
      kind: 'recurring' as const,
      id: p.id,
      name: p.name,
      dueDate: p.nextDueDate ? new Date(p.nextDueDate) : null,
      amount: p.amount ?? 0,
      days: p.daysRemaining ?? 0
    }));

  const upcomingPayments = [...cardItems, ...recurringItems].sort((a, b) => a.days - b.days);

  const totals = data.reduce(
    (acc, card) => {
      acc.limit += card.creditLimit ?? 0;
      acc.owed += card.currentOwed ?? 0;
      return acc;
    },
    { limit: 0, owed: 0 }
  );

  const overallUtilization = totals.limit > 0 ? totals.owed / totals.limit : null;

  if (isLoading || isLoadingRecurring) {
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
        <CardTitle className='text-base font-semibold'>Credit Cards & Recurring Payments</CardTitle>
      </CardHeader>
      <CardContent className='pt-0 space-y-4'>
        <>
          <div>
              <div className='text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2'>Upcoming Payments</div>
              {upcomingPayments.length === 0 ? (
                <div className='text-xs text-muted-foreground'>No upcoming payments.</div>
              ) : (
                <div className='space-y-2'>
                  {upcomingPayments.map(item => (
                    <div key={item.id} className='flex items-center justify-between rounded border border-border px-3 py-2 text-xs'>
                      <div>
                        <span className='font-medium'>{item.name}</span>
                        {item.dueDate && (
                          <span className='text-muted-foreground ml-2'>Due {format(item.dueDate, 'MMM dd')}</span>
                        )}
                      </div>
                      <div className='flex items-center gap-2 shrink-0'>
                        <span className='font-medium'>{formatCurrency(item.amount)}</span>
                        <span className={cn('text-muted-foreground', item.days < 0 && 'text-destructive')}>
                          {formatRemainingTime(item.days, item.dueDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='border-t border-border pt-3'>
              <div className='text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2'>Credit Card Utilization</div>
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
