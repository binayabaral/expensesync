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
        icon={FaPiggyBank}
        isLoading={isLoading}
        period={{ from, to }}
        title='Current Balance'
        value={data?.remainingAmount}
        percentageChange={data?.remainingChange}
        subtitle='Accumulated balance of selected accounts'
        variant={data?.remainingChange ? (data.remainingChange > 0 ? 'success' : 'destructive') : 'default'}
      />
      <DataCard
        title='Income'
        isLoading={isLoading}
        icon={FaArrowTrendUp}
        period={{ from, to }}
        subtitle={dateRangeLabel}
        percentageChange={data?.incomeChange}
        value={Math.abs(data?.incomeAmount || 0)}
        variant={data?.incomeChange ? (data.incomeChange > 0 ? 'success' : 'warning') : 'default'}
      />
      <DataCard
        title='Expenses'
        period={{ from, to }}
        isLoading={isLoading}
        icon={FaArrowTrendDown}
        subtitle={dateRangeLabel}
        percentageChange={data?.expenseChange}
        value={Math.abs(data?.expensesAmount || 0)}
        variant={data?.expenseChange ? (data.expenseChange > 0 ? 'destructive' : 'success') : 'default'}
      />
    </div>
  );
}

export default DataGrid;
