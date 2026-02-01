'use client';

import { Suspense } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddCategory } from '@/features/categories/hooks/useAddCategory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBulkDeleteCategories } from '@/features/categories/api/useBulkDeleteCategories';
import { useGetCategoriesWithExpenses } from '@/features/categories/api/useGetCategoriesWithExpenses';

import { BuildColumns } from './columns';

function Categories() {
  const newCategory = useAddCategory();
  const deleteCategories = useBulkDeleteCategories();
  const categoriesQuery = useGetCategoriesWithExpenses();

  const categories = categoriesQuery.data || [];
  const isDisabled = categoriesQuery.isLoading || deleteCategories.isPending;

  const columns = BuildColumns(categories);

  if (categoriesQuery.isLoading) {
    return (
      <div className='max-w-full'>
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
    <div className='max-w-full'>
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-lg font-semibold'>Categories</CardTitle>
          <Button onClick={newCategory.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            hasFooter
            columns={columns}
            data={categories}
            onDeleteAction={row => {
              const ids = row.map(r => r.original.id);
              deleteCategories.mutate({ ids });
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
      <Categories />
    </Suspense>
  );
};

export default Page;
