'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Row } from '@tanstack/react-table';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddCategory } from '@/features/categories/hooks/useAddCategory';
import { useEditCategory } from '@/features/categories/api/useEditCategory';
import { useCreateCategory } from '@/features/categories/api/useCreateCategory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetCategoriesWithExpenses } from '@/features/categories/api/useGetCategoriesWithExpenses';

import { BuildColumns, buildEditingValues, EditingValues, ResponseType } from './columns';

const NEW_ROW_ID = '__new__';

function Categories() {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditingValues | null>(null);

  const newCategory = useAddCategory();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periods = searchParams.get('periods') || '6';

  const categoriesQuery = useGetCategoriesWithExpenses();
  const categories = categoriesQuery.data || [];

  const editMutation = useEditCategory(editingRowId && editingRowId !== NEW_ROW_ID ? editingRowId : undefined);
  const createMutation = useCreateCategory();

  const setPeriods = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('periods', value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const updateEditingValues = (patch: Partial<EditingValues>) => {
    setEditingValues(prev => (prev ? { ...prev, ...patch } : null));
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditingValues(null);
  };

  const saveEditing = () => {
    if (!editingValues) return;
    if (!editingValues.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (editingRowId === NEW_ROW_ID) {
      createMutation.mutate(
        { name: editingValues.name },
        { onSuccess: () => { setEditingRowId(null); setEditingValues(null); } }
      );
    } else {
      editMutation.mutate(
        { name: editingValues.name },
        { onSuccess: () => { setEditingRowId(null); setEditingValues(null); } }
      );
    }
  };

  const startEditingById = (id: string, values: EditingValues) => {
    if (editingRowId) return;
    setEditingRowId(id);
    setEditingValues(values);
  };

  const startAddingNew = () => {
    if (editingRowId) return;
    setEditingRowId(NEW_ROW_ID);
    setEditingValues({ name: '' });
  };

  const handleAddNew = () => {
    newCategory.onOpen();
  };

  const onRowClick = (row: Row<ResponseType>) => {
    if (editingRowId) return;
    if (row.original.id === NEW_ROW_ID) return;
    startEditingById(row.original.id, buildEditingValues(row.original));
  };

  useEffect(() => {
    if (!editingRowId) return;
    const timer = setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>('[data-editing="true"] input:not([disabled])');
      firstInput?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [editingRowId]);

  const saveEditingRef = useRef(saveEditing);
  useEffect(() => { saveEditingRef.current = saveEditing; });

  const startAddingNewRef = useRef(startAddingNew);
  useEffect(() => { startAddingNewRef.current = startAddingNew; });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        startAddingNewRef.current();
        return;
      }
      if (!editingRowId) return;
      if (e.key === 'Escape') { cancelEditing(); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveEditingRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingRowId]);

  const isSaving = editMutation.isPending || createMutation.isPending;

  const meta = {
    editingRowId,
    editingValues,
    updateEditingValues,
    cancelEditing,
    saveEditing,
    startEditingById,
    isSaving
  };

  const newRowSentinel = {
    id: NEW_ROW_ID,
    name: '',
    amount: 0,
    prevAmounts: []
  } as unknown as ResponseType;

  const tableData = editingRowId === NEW_ROW_ID ? [newRowSentinel, ...categories] : categories;
  const columns = BuildColumns(tableData);

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
          <div className='flex items-center gap-2'>
            <Select value={periods} onValueChange={setPeriods}>
              <SelectTrigger className='w-36'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='6'>6 months</SelectItem>
                <SelectItem value='12'>12 months</SelectItem>
                <SelectItem value='all'>All time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddNew} disabled={!!editingRowId}>
              <Plus className='size-4 mr-2' />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col flex-1 min-h-0 pb-4'>
          <DataTable
            hasFooter
            columns={columns}
            data={tableData}
            pinnedColumns={1}
            meta={meta}
            onRowClick={onRowClick}
            isRowHighlighted={row => row.original.id === editingRowId}
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
