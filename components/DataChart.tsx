'use client';

import Chart from '@/components/Chart';
import { useGetSummary } from '@/features/summary/api/useGetSummary';
import CategorySpendingChart from '@/components/CategorySpendingChart';
import PayeeSpendingChart from '@/components/PayeeSpendingChart';

function DataChart() {
  const { data, isLoading } = useGetSummary();

  return (
    <div className='grid grid-cols-1 lg:grid-cols-6 gap-3'>
      <div className='col-span-1 lg:col-span-3'>
        <CategorySpendingChart data={data?.categories} isLoading={isLoading} />
      </div>
      <div className='col-span-1 lg:col-span-3'>
        <PayeeSpendingChart data={data?.payees} isLoading={isLoading} />
      </div>
      <div className='col-span-1 lg:col-span-6'>
        <Chart data={data?.days} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default DataChart;
