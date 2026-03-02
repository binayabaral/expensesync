'use client';

import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCloseLoan } from '@/features/loans/api/useCloseLoan';
import { LoanResponseType } from '@/features/loans/api/useGetLoans';
import { useConfirm } from '@/hooks/useConfirm';

type Props = {
  loan: LoanResponseType;
};

export const PeerLoanCard = ({ loan }: Props) => {
  const closeLoanMutation = useCloseLoan(loan.id);
  const [ConfirmDialog, confirm] = useConfirm('Archive this loan?', 'This will mark the loan as closed.');

  const balance = loan.currentBalance ?? 0;
  const isPositive = balance >= 0;

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
              <Badge variant='secondary' className='text-xs'>Peer</Badge>
            </div>
            {balance === 0 && (
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
        <CardContent className='px-4 pb-2 pt-1'>
          <div>
            <p className='text-xs text-muted-foreground'>
              {isPositive ? 'They owe you' : 'You owe them'}
            </p>
            <p className={`text-xl font-bold ${isPositive ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(balance))}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export const PeerLoanCardSkeleton = () => (
  <Card className='border border-slate-200 shadow-none'>
    <CardHeader className='pb-0 pt-2 px-4 space-y-0'>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-4 w-36' />
        <Skeleton className='h-5 w-9 rounded-full' />
      </div>
    </CardHeader>
    <CardContent className='px-4 pb-2 pt-1'>
      <Skeleton className='h-4 w-20 mb-1' />
      <Skeleton className='h-7 w-32' />
    </CardContent>
  </Card>
);
