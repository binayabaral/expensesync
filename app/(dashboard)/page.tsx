'use client';

import { Suspense } from 'react';

import DataGrid from '@/components/DataGrid';
import DataChart from '@/components/DataChart';
import { CreditCardPaymentsWidget } from '@/components/CreditCardPaymentsWidget';
import { CreditCardUtilizationWidget } from '@/components/CreditCardUtilizationWidget';

export default function DashboardPage() {
  return (
    <div className='max-w-full'>
      <Suspense>
        <DataGrid />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 pb-4'>
          <CreditCardPaymentsWidget />
          <CreditCardUtilizationWidget />
        </div>
        <DataChart />
      </Suspense>
    </div>
  );
}
