'use client';

import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddCategory } from '@/features/categories/hooks/useAddCategory';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBulkDeleteCategories } from '@/features/categories/api/useBulkDeleteCategories';

import { columns } from './columns';

function Categories() {
  const newCategory = useAddCategory();
  const categoriesQuery = useGetCategories();
  const deleteCategories = useBulkDeleteCategories();

  const categories = categoriesQuery.data || [];
  const isDisabled = categoriesQuery.isLoading || deleteCategories.isPending;

  if (categoriesQuery.isLoading) {
    return (
      <div className='container mx-auto pb-10 -mt-24'>
        <Card className='border-none drop-shadow-sm'>
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
    <div className='container mx-auto pb-10 -mt-24'>
      <Card className='border-none drop-shadow-sm'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between'>
          <CardTitle className='text-xl line-clamp-1'>Categories Page</CardTitle>
          <Button onClick={newCategory.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={categories}
            filterKey='name'
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

export default Categories;
