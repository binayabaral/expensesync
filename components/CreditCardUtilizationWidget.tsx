'use client';

import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { useGetCreditCards } from '@/features/credit-cards/api/useGetCreditCards';

const getUtilizationTone = (value?: number | null) => {
  if (value === null || value === undefined) {
    return 'bg-slate-200';
  }

  if (value <= 0.3) {
    return 'bg-emerald-500';
  }

  if (value <= 0.7) {
    return 'bg-amber-500';
  }

  return 'bg-rose-500';
};

export const CreditCardUtilizationWidget = () => {
  const { data = [], isLoading } = useGetCreditCards();

  const totals = data.reduce(
    (acc, card) => {
      acc.limit += card.creditLimit ?? 0;
      acc.owed += card.currentOwed ?? 0;
      return acc;
    },
    { limit: 0, owed: 0 }
  );

  const overallUtilization = totals.limit > 0 ? totals.owed / totals.limit : null;

  return (
    <Card className='border border-slate-200 shadow-none'>
      <CardHeader>
        <CardTitle className='text-lg font-semibold'>Credit Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='h-32 w-full flex items-center justify-center'>
            <Loader2 className='size-6 text-slate-300 animate-spin' />
          </div>
        ) : data.length === 0 ? (
          <div className='text-sm text-muted-foreground'>No credit cards available.</div>
        ) : (
          <div className='space-y-4'>
            <div>
              <div className='flex items-center justify-between text-sm'>
                <span>Overall</span>
                <span className='text-muted-foreground'>
                  {overallUtilization !== null ? `${Math.round(overallUtilization * 100)}%` : 'N/A'}
                </span>
              </div>
              <div className='mt-2 h-2 w-full rounded-full bg-slate-100'>
                <div
                  className={cn('h-2 rounded-full transition-all', getUtilizationTone(overallUtilization))}
                  style={{ width: overallUtilization ? `${Math.min(overallUtilization * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
            {data.map(card => (
              <div key={card.id} className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span>{card.name}</span>
                  <span className='text-muted-foreground'>
                    {card.utilization !== null ? `${Math.round(card.utilization * 100)}%` : 'N/A'}
                  </span>
                </div>
                <div className='h-2 w-full rounded-full bg-slate-100'>
                  <div
                    className={cn('h-2 rounded-full transition-all', getUtilizationTone(card.utilization))}
                    style={{ width: card.utilization ? `${Math.min(card.utilization * 100, 100)}%` : '0%' }}
                  />
                </div>
                <div className='text-xs text-muted-foreground'>
                  Owed {formatCurrency(card.currentOwed)} of {formatCurrency(card.creditLimit ?? 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
