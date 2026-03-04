'use client';

import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCloseLoan } from '@/features/loans/api/useCloseLoan';
import { LoanResponseType } from '@/features/loans/api/useGetLoans';
import { useConfirm } from '@/hooks/useConfirm';

type Props = {
  loan: LoanResponseType;
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export const EmiLoanCard = ({ loan }: Props) => {
  const closeLoanMutation = useCloseLoan(loan.id);
  const [ConfirmDialog, confirm] = useConfirm('Archive this loan?', 'This will mark the loan as closed and deactivate its recurring payment.');

  const originalPrincipal = loan.originalPrincipal ?? 0;
  const amountPaid = loan.amountPaid ?? 0;
  const paymentCount = loan.paymentCount ?? 0;
  const totalPayments = loan.totalPayments ?? null;
  const progressPercentage = loan.progressPercentage ?? 0;
  const progressDisplay = Math.min(100, Math.round(progressPercentage * 100));
  const isOpenEnded = !loan.loanTenureMonths && originalPrincipal === 0;

  const remaining = Math.abs(loan.currentBalance ?? 0);

  const handleClose = async () => {
    const ok = await confirm();
    if (ok) {
      closeLoanMutation.mutate();
    }
  };

  return (
    <>
      <ConfirmDialog />
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='pb-0 pt-2 px-4 space-y-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <CardTitle className='text-sm font-semibold'>{loan.name}</CardTitle>
              <Badge variant='secondary' className='text-xs'>EMI</Badge>
              {isOpenEnded && <Badge variant='outline' className='text-xs'>Open-ended</Badge>}
            </div>
            {(loan.currentBalance ?? 0) === 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-muted-foreground hover:text-foreground'
                disabled={closeLoanMutation.isPending}
                onClick={handleClose}
              >
                Archive
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className='px-4 pb-2 pt-1 space-y-1'>
          <div className='space-y-1'>
            <div className='flex justify-between text-xs'>
              <span className='text-muted-foreground'>Progress</span>
              <span className='font-medium'>{progressDisplay}%</span>
            </div>
            <Progress value={progressDisplay} className='h-2' />
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>Paid: {formatCurrency(amountPaid)}</span>
              <span>Total: {formatCurrency(amountPaid + remaining)}</span>
            </div>
          </div>

          <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs'>
            <div>
              <span className='text-muted-foreground'>Remaining: </span>
              <span className='font-semibold text-destructive'>{formatCurrency(remaining)}</span>
            </div>
            {paymentCount > 0 && (
              <div>
                <span className='text-muted-foreground'>Payments: </span>
                <span className='font-semibold'>{paymentCount}{totalPayments ? ` / ${totalPayments}` : ''}</span>
              </div>
            )}
            {loan.apr && (
              <div>
                <span className='text-muted-foreground'>Rate: </span>
                <span className='font-semibold'>{loan.apr}%</span>
              </div>
            )}
            {loan.paymentDueDay && (
              <div>
                <span className='text-muted-foreground'>Due: </span>
                <span className='font-semibold'>{ordinal(loan.paymentDueDay)}</span>
              </div>
            )}
          </div>

          {loan.linkedRecurringPayment && (
            <div className='flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1 text-xs'>
              <div className='flex-1 min-w-0'>
                <span className='text-muted-foreground'>Recurring: </span>
                <span className='font-medium'>{loan.linkedRecurringPayment.name}</span>
                <span className='text-muted-foreground'>
                  {' · '}
                  {formatCurrency(loan.linkedRecurringPayment.amount)} principal
                  {loan.linkedRecurringPayment.transferCharge > 0 && (
                    <> + {formatCurrency(loan.linkedRecurringPayment.transferCharge)} interest</>
                  )}
                  {loan.linkedRecurringPayment.intervalMonths && loan.linkedRecurringPayment.intervalMonths > 1
                    ? ` · every ${loan.linkedRecurringPayment.intervalMonths} months`
                    : loan.linkedRecurringPayment.dayOfMonth
                      ? ` · ${ordinal(loan.linkedRecurringPayment.dayOfMonth)}`
                      : ''}
                </span>
              </div>
              {!loan.linkedRecurringPayment.isActive && (
                <Badge variant='outline' className='text-xs text-muted-foreground shrink-0'>Inactive</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export const EmiLoanCardSkeleton = () => (
  <Card className='border border-slate-200 shadow-none'>
    <CardHeader className='pb-0 pt-2 px-4 space-y-0'>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='h-5 w-9 rounded-full' />
      </div>
    </CardHeader>
    <CardContent className='px-4 pb-2 pt-1 space-y-1'>
      <div className='space-y-1'>
        <div className='flex justify-between'>
          <Skeleton className='h-4 w-14' />
          <Skeleton className='h-4 w-8' />
        </div>
        <Skeleton className='h-2 w-full rounded-full' />
        <div className='flex justify-between'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-4 w-24' />
        </div>
      </div>
      <div className='flex gap-4'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-4 w-14' />
        <Skeleton className='h-4 w-10' />
      </div>
      <Skeleton className='h-6 w-full rounded-md' />
    </CardContent>
  </Card>
);
