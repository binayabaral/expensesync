'use client';

import { Suspense } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddCategory } from '@/features/categories/hooks/useAddCategory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetCategoriesWithExpenses } from '@/features/categories/api/useGetCategoriesWithExpenses';

import { BuildColumns } from './columns';

function Categories() {
  const newCategory = useAddCategory();
  const categoriesQuery = useGetCategoriesWithExpenses();

  const categories = categoriesQuery.data || [];

  const columns = BuildColumns(categories);

  if (categoriesQuery.isLoading) {
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
          <CardTitle className='text-lg font-semibold'>Categories</CardTitle>
          <Button onClick={newCategory.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='flex flex-col flex-1 min-h-0 pb-4'>
          <DataTable hasFooter columns={columns} data={categories} />
        </CardContent>
      </Card>
    </div>
  );
}

const Page = () => {
  return (
    <Suspense>
      <Categories />
    </Suspense>
  );
};

export default Page;
