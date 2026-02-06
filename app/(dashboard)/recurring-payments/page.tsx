'use client';

import { Suspense } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetRecurringPayments } from '@/features/recurring-payments/api/useGetRecurringPayments';
import { useAddRecurringPayment } from '@/features/recurring-payments/hooks/useAddRecurringPayment';

import { columns } from './columns';

function RecurringPayments() {
  const paymentsQuery = useGetRecurringPayments();
  const addRecurringPayment = useAddRecurringPayment();

  const payments = paymentsQuery.data || [];
  const isLoading = paymentsQuery.isLoading;

  if (isLoading) {
    return (
      <div className='max-w-full'>
        <Card className='border border-slate-200 shadow-none'>
          <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
            <Skeleton className='h-6 w-32' />
            <Skeleton className='h-9 w-36' />
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
    <div className='max-w-full'>
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-lg font-semibold'>Recurring Payments</CardTitle>
          <Button onClick={addRecurringPayment.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={payments} onDeleteAction={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}

const Page = () => {
  return (
    <Suspense>
      <RecurringPayments />
    </Suspense>
  );
};

export default Page;
