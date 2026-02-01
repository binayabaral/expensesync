'use client';

import { FaPiggyBank } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';
import { FaArrowTrendUp, FaArrowTrendDown, FaMoneyBillTransfer } from 'react-icons/fa6';

import DataCard from '@/components/DataCard';
import { formatDateRange, formatPercentage } from '@/lib/utils';
import { useGetSummary } from '@/features/summary/api/useGetSummary';

function DataGrid() {
  const { data, isLoading } = useGetSummary();

  const params = useSearchParams();
  const to = params.get('to') || undefined;
  const from = params.get('from') || undefined;

  const dateRangeLabel = formatDateRange({ to, from });

  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-3 pb-4'>
      <DataCard
        icon={FaPiggyBank}
        isLoading={isLoading}
        title='Current Balance'
        value={data?.remainingAmount}
        subtitle='Accumulated balance of selected accounts'
        variant={data?.remainingChange ? (data.remainingChange > 0 ? 'success' : 'destructive') : 'default'}
        baseText={formatPercentage(
          data?.remainingChange || 0,
          { addPrefix: true, showEndDateOnly: true },
          { from, to }
        )}
      />
      <DataCard
        title='Income'
        isLoading={isLoading}
        icon={FaArrowTrendUp}
        subtitle={dateRangeLabel}
        value={Math.abs(data?.incomeAmount || 0)}
        baseText={formatPercentage(data?.incomeChange || 0, { addPrefix: true }, { from, to })}
        variant={data?.incomeChange ? (data.incomeChange > 0 ? 'success' : 'warning') : 'default'}
      />
      <DataCard
        title='Expenses'
        isLoading={isLoading}
        icon={FaArrowTrendDown}
        subtitle={dateRangeLabel}
        value={Math.abs(data?.expensesAmount || 0)}
        baseText={formatPercentage(data?.expenseChange || 0, { addPrefix: true }, { from, to })}
        variant={data?.expenseChange ? (data.expenseChange > 0 ? 'destructive' : 'success') : 'default'}
      />
      <DataCard
        title='Extra Charges'
        isLoading={isLoading}
        icon={FaMoneyBillTransfer}
        subtitle={dateRangeLabel}
        value={Math.abs(data?.transferCharges || 0)}
        baseText={formatPercentage(data?.transferChargesChange || 0, { addPrefix: true }, { from, to })}
        variant={data?.transferChargesChange ? (data.transferChargesChange > 0 ? 'destructive' : 'success') : 'default'}
      />
    </div>
  );
}

export default DataGrid;
