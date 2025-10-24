'use client';

import { Suspense } from 'react';

import DataGrid from '@/components/DataGrid';
import DataChart from '@/components/DataChart';

export default function DashboardPage() {
  return (
    <div className='container mx-auto px-2 pb-5'>
      <Suspense>
        <DataGrid />
        <DataChart />
      </Suspense>
    </div>
  );
}
