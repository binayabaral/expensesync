'use client';

import { Suspense } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAssets } from '@/features/assets/api/useGetAssets';
import { useAddAsset } from '@/features/assets/hooks/useAddAsset';
import { AssetLotsSheet } from '@/features/assets/components/AssetLotsSheet';

import { columns } from './columns';

function AssetsPageInner() {
  const assetsQuery = useGetAssets();
  const openAddAsset = useAddAsset();

  const assets = assetsQuery.data || [];
  const isLoading = assetsQuery.isLoading;

  if (isLoading) {
    return (
      <div className='max-w-full'>
        <Card className='border border-slate-200 shadow-none'>
          <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-9 w-24' />
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
          <CardTitle className='text-lg font-semibold'>Assets</CardTitle>
          <Button onClick={openAddAsset.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='space-y-6'>
          <DataTable columns={columns} data={assets} hasFooter onDeleteAction={() => {}} />
          <AssetLotsSheet />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AssetsPageInner />
    </Suspense>
  );
}


