'use client';

import { format } from 'date-fns';
import { FaLandmark } from 'react-icons/fa';
import { FaChartLine, FaFileInvoiceDollar } from 'react-icons/fa6';

import DataCard from '@/components/DataCard';
import { useGetHealth } from '@/features/health/api/useGetHealth';

function HealthDataGrid() {
  const { data, isLoading } = useGetHealth();

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 pb-6'>
      <DataCard
        title='Assets'
        variant='success'
        icon={FaLandmark}
        isLoading={isLoading}
        value={data?.summary.assets}
        subtitle='Accumulated balance of all assets'
        baseText={`On ${format(data?.dateInterval.end || new Date(), 'LLL dd, y')}`}
      />
      <DataCard
        title='Liabilities'
        variant='destructive'
        isLoading={isLoading}
        icon={FaFileInvoiceDollar}
        value={Math.abs(data?.summary.liabilities || 0)}
        subtitle='Accumulated balance of all liabilities'
        baseText={`On ${format(data?.dateInterval.end || new Date(), 'LLL dd, y')}`}
      />
      <DataCard
        title='Net Worth'
        icon={FaChartLine}
        isLoading={isLoading}
        subtitle='Current Net Worth'
        value={data?.summary.netWorth}
        baseText={`On ${format(data?.dateInterval.end || new Date(), 'LLL dd, y')}`}
        variant={data?.summary.netWorth ? (data.summary.netWorth > 0 ? 'success' : 'destructive') : 'default'}
      />
    </div>
  );
}

export default HealthDataGrid;
