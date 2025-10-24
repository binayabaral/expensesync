'use client';

import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddTransaction } from '@/features/transactions/hooks/useAddTransaction';
import { useGetTransactions } from '@/features/transactions/api/useGetTransactions';
import { useBulkDeleteTransactions } from '@/features/transactions/api/useBulkDeleteTransactions';

import { columns } from './columns';
import { Suspense } from 'react';

function Transactions() {
  const newTransaction = useAddTransaction();
  const transactionsQuery = useGetTransactions();
  const deleteTransactions = useBulkDeleteTransactions();

  const transactions = transactionsQuery.data || [];
  const isDisabled = transactionsQuery.isLoading || deleteTransactions.isPending;

  if (transactionsQuery.isLoading) {
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
          <CardTitle className='text-xl md:text-2xl'>Transactions History</CardTitle>
          <Button onClick={newTransaction.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transactions}
            filterKey='payee'
            onDeleteAction={row => {
              const ids = row.map(r => r.original.id);
              deleteTransactions.mutate({ ids });
            }}
            disabled={isDisabled}
          />
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
