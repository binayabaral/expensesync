'use client';

import { Suspense } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetRecurringPayments } from '@/features/recurring-payments/api/useGetRecurringPayments';
import { useAddRecurringPayment } from '@/features/recurring-payments/hooks/useAddRecurringPayment';

import { columns, mobileRow } from './columns';

function RecurringPayments() {
  const paymentsQuery = useGetRecurringPayments();
  const addRecurringPayment = useAddRecurringPayment();

  const payments = paymentsQuery.data || [];
  const isLoading = paymentsQuery.isLoading;

  if (isLoading) {
    return (
      <div className='flex flex-col flex-1 min-h-0'>
        <Card className='border border-border shadow-none flex flex-col flex-1 min-h-0'>
          <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
            <Skeleton className='h-6 w-32' />
            <Skeleton className='h-9 w-36' />
          </CardHeader>
          <CardContent>
            <div className='h-80 w-full flex items-center justify-center'>
              <Loader2 className='size-12 text-muted-foreground animate-spin' />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex flex-col flex-1 min-h-0'>
      <Card className='border border-border shadow-none flex flex-col flex-1 min-h-0'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-lg font-semibold'>Recurring Payments</CardTitle>
          <Button onClick={() => addRecurringPayment.onOpen()}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='flex flex-col flex-1 min-h-0 pb-4'>
          <DataTable columns={columns} data={payments} renderMobileRow={mobileRow} />
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
