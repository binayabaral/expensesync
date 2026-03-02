'use client';

import Chart from '@/components/Chart';
import { useGetSummary } from '@/features/summary/api/useGetSummary';
import CategorySpendingChart from '@/components/CategorySpendingChart';
import PayeeSpendingChart from '@/components/PayeeSpendingChart';
import { CreditCardCombinedWidget } from '@/components/CreditCardCombinedWidget';
import { useGetCreditCards } from '@/features/credit-cards/api/useGetCreditCards';

function DataChart() {
  const { data, isLoading } = useGetSummary();
  const { data: creditCards = [], isLoading: creditCardsLoading } = useGetCreditCards();

  const hasCreditCards = creditCardsLoading || creditCards.length > 0;

  return (
    <div className={`grid grid-cols-1 gap-3 ${hasCreditCards ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
      <CategorySpendingChart data={data?.categories} isLoading={isLoading} />
      <PayeeSpendingChart data={data?.payees} isLoading={isLoading} />
      {hasCreditCards && <CreditCardCombinedWidget />}
      <div className={`col-span-1 ${hasCreditCards ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
        <Chart data={data?.days} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default DataChart;
