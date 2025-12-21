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
          <CardTitle className='text-xl md:text-2xl'>Assets</CardTitle>
          <Button onClick={openAddAsset.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='space-y-6'>
          <DataTable columns={columns} data={assets} filterKey='name' hasFooter onDeleteAction={() => {}} />
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


