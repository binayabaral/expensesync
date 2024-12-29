'use client';

import { FaPiggyBank } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';
import { FaArrowTrendUp, FaArrowTrendDown } from 'react-icons/fa6';

import DataCard from '@/components/DataCard';
import { formatDateRange } from '@/lib/utils';
import { useGetSummary } from '@/features/summary/api/useGetSummary';

function DataGrid() {
  const { data, isLoading } = useGetSummary();

  const params = useSearchParams();
  const to = params.get('to') || undefined;
  const from = params.get('from') || undefined;

  const dateRangeLabel = formatDateRange({ to, from });

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 pb-2 mb-8'>
      <DataCard
        variant='default'
        icon={FaPiggyBank}
        isLoading={isLoading}
        period={{ from, to }}
        title='Current Balance'
        value={data?.remainingAmount}
        percentageChange={data?.remainingChange}
        subtitle='Accumulated balance of selected accounts'
      />
      <DataCard
        title='Income'
        variant='default'
        isLoading={isLoading}
        icon={FaArrowTrendUp}
        period={{ from, to }}
        value={data?.incomeAmount}
        subtitle={dateRangeLabel}
        percentageChange={data?.incomeChange}
      />
      <DataCard
        title='Expenses'
        variant='default'
        period={{ from, to }}
        isLoading={isLoading}
        icon={FaArrowTrendDown}
        subtitle={dateRangeLabel}
        value={data?.expensesAmount}
        percentageChange={data?.expenseChange}
      />
    </div>
  );
}

export default DataGrid;
