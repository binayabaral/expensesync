'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetPayeesWithExpenses } from '@/features/payees/api/useGetPayeesWithExpenses';

import { BuildColumns } from './columns';

function Payees() {
  const payeesQuery = useGetPayeesWithExpenses();

  const payees = payeesQuery.data || [];

  const columns = BuildColumns(payees);

  if (payeesQuery.isLoading) {
    return (
      <div className='container mx-auto px-2 pb-5'>
        <Card className='border border-slate-200 shadow-none'>
          <CardHeader>
            <Skeleton className='h-8 w-48' />
          </CardHeader>
          <CardContent>
            <div className='h-80 w-full flex items-center justify-center'>
              <Loader2 className='size-12 text-slate-300 animate-spin' />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-2 pb-5'>
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-xl md:text-2xl'>Payees</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable hasFooter columns={columns} data={payees} onDeleteAction={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}

const Page = () => {
  return (
    <Suspense>
      <Payees />
    </Suspense>
  );
};

export default Page;
