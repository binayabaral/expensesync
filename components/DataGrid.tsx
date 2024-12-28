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
        title='Remaining'
        variant='default'
        icon={FaPiggyBank}
        isLoading={isLoading}
        dateRange={dateRangeLabel}
        value={data?.remainingAmount}
        percentageChange={data?.remainingChange}
      />
      <DataCard
        title='Income'
        variant='default'
        isLoading={isLoading}
        icon={FaArrowTrendUp}
        value={data?.incomeAmount}
        dateRange={dateRangeLabel}
        percentageChange={data?.incomeChange}
      />
      <DataCard
        title='Expenses'
        variant='default'
        isLoading={isLoading}
        icon={FaArrowTrendDown}
        dateRange={dateRangeLabel}
        value={data?.expensesAmount}
        percentageChange={data?.expenseChange}
      />
    </div>
  );
}

export default DataGrid;
