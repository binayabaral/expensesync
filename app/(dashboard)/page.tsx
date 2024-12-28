'use client';

import { Suspense } from 'react';

import DataGrid from '@/components/DataGrid';
import DataChart from '@/components/DataChart';

export default function DashboardPage() {
  return (
    <div className='container mx-auto pb-5 -mt-24'>
      <Suspense>
        <DataGrid />
        <DataChart />
      </Suspense>
    </div>
  );
}
