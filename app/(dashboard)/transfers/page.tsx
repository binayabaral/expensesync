'use client';

import { Suspense } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetTransfers } from '@/features/transfers/api/useGetTransfers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBulkDeleteTransfers } from '@/features/transfers/api/useBulkDeleteTransfers';
import { useOpenAddTransferSheet } from '@/features/transfers/hooks/useOpenAddTransferSheet';

import { columns } from './columns';

function TransferPage() {
  const transfersQuery = useGetTransfers();
  const deleteTransfers = useBulkDeleteTransfers();
  const openAddTransferSheet = useOpenAddTransferSheet();

  const transactions = transfersQuery.data || [];
  const isLoading = transfersQuery.isLoading || deleteTransfers.isPending;

  if (isLoading) {
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
          <CardTitle className='text-xl md:text-2xl'>Transfers History</CardTitle>
          <Button onClick={openAddTransferSheet.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            filterKey='date'
            columns={columns}
            data={transactions}
            disabled={isLoading}
            onDeleteAction={row => {
              const ids = row.map(r => r.original.id);
              deleteTransfers.mutate({ ids });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <TransferPage />
    </Suspense>
  );
}
