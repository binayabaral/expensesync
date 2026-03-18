'use client';

import { Suspense } from 'react';

import DataGrid from '@/components/DataGrid';
import DataChart from '@/components/DataChart';

export default function DashboardPage() {
  return (
    <div className='max-w-full'>
      <Suspense>
        <DataGrid />
        <DataChart />
      </Suspense>
    </div>
  );
}
