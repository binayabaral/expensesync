'use client';

import { Suspense } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetTransfers } from '@/features/transfers/api/useGetTransfers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpenAddTransferSheet } from '@/features/transfers/hooks/useOpenAddTransferSheet';

import { columns } from './columns';

function TransferPage() {
  const transfersQuery = useGetTransfers();
  const openAddTransferSheet = useOpenAddTransferSheet();

  const transactions = transfersQuery.data || [];
  const isLoading = transfersQuery.isLoading;

  if (isLoading) {
    return (
      <div className='flex flex-col flex-1 min-h-0'>
        <Card className='border border-border shadow-none flex flex-col flex-1 min-h-0'>
          <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
            <Skeleton className='h-6 w-32' />
            <Skeleton className='h-9 w-24' />
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
          <CardTitle className='text-lg font-semibold'>Transfers History</CardTitle>
          <Button onClick={() => openAddTransferSheet.onOpen()}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='flex flex-col flex-1 min-h-0 pb-4'>
          <DataTable columns={columns} data={transactions} />
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
