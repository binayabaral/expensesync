'use client';

import { useState, Suspense } from 'react';

import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetLoans } from '@/features/loans/api/useGetLoans';
import { EmiLoanCard, EmiLoanCardSkeleton } from '@/features/loans/components/EmiLoanCard';
import { PeerLoanCard, PeerLoanCardSkeleton } from '@/features/loans/components/PeerLoanCard';
import { ClosedLoanCard } from '@/features/loans/components/ClosedLoanCard';
import { LoanPaymentChart, LoanPaymentChartSkeleton } from '@/features/loans/components/LoanPaymentChart';

function Loans() {
  const [showAllPeer, setShowAllPeer] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const loansQuery = useGetLoans();
  const loans = loansQuery.data ?? [];

  const emiLoans = loans.filter(l => l.loanSubType === 'EMI' && !l.isClosed);
  const peerLoans = loans.filter(l => l.loanSubType === 'PEER' && !l.isClosed);
  const unclassifiedLoans = loans.filter(l => !l.loanSubType && !l.isClosed);
  const visiblePeerLoans = showAllPeer ? peerLoans : peerLoans.filter(l => l.currentBalance !== 0);
  const closedLoans = loans.filter(l => l.isClosed);

  if (loansQuery.isLoading) {
    return (
      <div className='max-w-full space-y-6'>
        <section>
          <Skeleton className='h-6 w-24 mb-3' />
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {[...Array(3)].map((_, i) => <EmiLoanCardSkeleton key={i} />)}
          </div>
        </section>

        <section>
          <div className='flex items-center justify-between mb-3'>
            <Skeleton className='h-6 w-16' />
            <Skeleton className='h-5 w-20' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {[...Array(3)].map((_, i) => <PeerLoanCardSkeleton key={i} />)}
          </div>
        </section>

        <LoanPaymentChartSkeleton />

        <section>
          <div className='flex items-center justify-between mb-3'>
            <Skeleton className='h-6 w-14' />
            <Skeleton className='h-5 w-28' />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className='h-full overflow-y-auto space-y-6'>
      {/* EMI Loans */}
      <section>
        <h2 className='text-base font-semibold mb-3'>EMI Loans</h2>
        {emiLoans.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No active EMI loans.</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {emiLoans.map(loan => (
              <EmiLoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        )}
      </section>

      {/* People (Peer) Loans */}
      <section>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-base font-semibold'>People</h2>
          <label className='flex items-center gap-2 text-sm text-muted-foreground cursor-pointer'>
            <Switch checked={showAllPeer} onCheckedChange={setShowAllPeer} />
            Show all
          </label>
        </div>
        {visiblePeerLoans.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {peerLoans.length === 0 ? 'No peer loans.' : 'No outstanding peer balances. Toggle "Show all" to see settled ones.'}
          </p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {visiblePeerLoans.map(loan => (
              <PeerLoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        )}
      </section>

      {/* Unclassified Loans */}
      {unclassifiedLoans.length > 0 && (
        <section>
          <h2 className='text-base font-semibold mb-3 text-muted-foreground'>Unclassified Loans</h2>
          <p className='text-sm text-muted-foreground mb-3'>
            These loans have no sub-type set. Edit them to assign EMI or Peer type.
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {unclassifiedLoans.map(loan => (
              <PeerLoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </section>
      )}

      <LoanPaymentChart loans={loans} />

      {/* Closed Loans */}
      <section>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-base font-semibold'>Closed</h2>
          <label className='flex items-center gap-2 text-sm text-muted-foreground cursor-pointer'>
            <Switch checked={showClosed} onCheckedChange={setShowClosed} />
            Show closed
          </label>
        </div>
        {showClosed && (
          closedLoans.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No closed loans.</p>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
              {closedLoans.map(loan => (
                <ClosedLoanCard key={loan.id} loan={loan} />
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}

const Page = () => {
  return (
    <Suspense>
      <Loans />
    </Suspense>
  );
};

export default Page;
