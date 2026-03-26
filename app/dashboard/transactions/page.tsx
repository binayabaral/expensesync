'use client';

import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddTransaction } from '@/features/transactions/hooks/useAddTransaction';
import { useGetTransactions } from '@/features/transactions/api/useGetTransactions';

import { columns, mobileRow } from './columns';
import { Suspense } from 'react';

function Transactions() {
  const newTransaction = useAddTransaction();
  const transactionsQuery = useGetTransactions();
  const transactions = transactionsQuery.data || [];

  if (transactionsQuery.isLoading) {
    return (
      <div className='flex flex-col flex-1 min-h-0'>
        <Card className='border border-border shadow-none flex flex-col flex-1 min-h-0'>
          <CardHeader>
            <Skeleton className='h-8 w-48' />
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
          <CardTitle className='text-lg font-semibold'>Transactions History</CardTitle>
          <Button onClick={() => newTransaction.onOpen()}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='flex flex-col flex-1 min-h-0 pb-4'>
          <DataTable columns={columns} data={transactions} renderMobileRow={mobileRow} />
        </CardContent>
      </Card>
    </div>
  );
}

const Page = () => {
  return (
    <Suspense>
      <Transactions />
    </Suspense>
  );
};

export default Page;
