'use client';

import { Loader2, Plus } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { startOfMinute } from 'date-fns';
import { Row } from '@tanstack/react-table';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { useCreateCategory } from '@/features/categories/api/useCreateCategory';
import { useAddTransaction } from '@/features/transactions/hooks/useAddTransaction';
import { useGetTransactions } from '@/features/transactions/api/useGetTransactions';
import { useEditTransaction } from '@/features/transactions/api/useEditTransaction';
import { useCreateTransaction } from '@/features/transactions/api/useCreateTransaction';
import { useGetPayeeCategories } from '@/features/transactions/api/useGetPayeeCategories';
import { convertAmountToMiliUnits } from '@/lib/utils';
import { toast } from 'sonner';

import { columns, mobileRow, buildEditingValues, EditingValues, ResponseType } from './columns';

const NEW_ROW_ID = '__new__';

function Transactions() {
  const params = useSearchParams();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditingValues | null>(null);

  const newTransaction = useAddTransaction();
  const transactionsQuery = useGetTransactions();
  const transactions = transactionsQuery.data || [];

  const accountsQuery = useGetAccounts();
  const accounts = accountsQuery.data ?? [];
  const accountOptions = accounts.filter(a => !a.isClosed).map(a => ({ label: a.name, value: a.id }));

  const categoryQuery = useGetCategories();
  const categoryMutation = useCreateCategory();
  const categoryOptions = (categoryQuery.data ?? []).map(c => ({ label: c.name, value: c.id }));
  const onCreateCategory = (name: string) => categoryMutation.mutate({ name });

  const editMutation = useEditTransaction(editingRowId && editingRowId !== NEW_ROW_ID ? editingRowId : undefined);
  const { data: payeeCategories = {} } = useGetPayeeCategories();
  const createMutation = useCreateTransaction();

  const updateEditingValues = (patch: Partial<EditingValues>) => {
    setEditingValues(prev => (prev ? { ...prev, ...patch } : null));
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditingValues(null);
  };

  const saveEditing = () => {
    if (!editingValues) return;

    if (!editingValues.accountId) {
      toast.error('Please select an account');
      return;
    }
    if (!editingValues.payee.trim()) {
      toast.error('Please enter a payee');
      return;
    }
    if (!editingValues.amount || parseFloat(editingValues.amount) === 0) {
      toast.error('Please enter an amount');
      return;
    }

    const payload = {
      ...editingValues,
      amount: convertAmountToMiliUnits(parseFloat(editingValues.amount)),
      date: new Date(editingValues.date)
    };

    if (editingRowId === NEW_ROW_ID) {
      createMutation.mutate(
        { ...payload, type: 'USER_CREATED' },
        { onSuccess: () => { setEditingRowId(null); setEditingValues(null); } }
      );
    } else {
      editMutation.mutate(payload, {
        onSuccess: () => { setEditingRowId(null); setEditingValues(null); }
      });
    }
  };

  const startEditingById = (id: string, values: EditingValues) => {
    if (editingRowId) return;
    setEditingRowId(id);
    setEditingValues(values);
  };

  const startAddingNew = () => {
    if (editingRowId) return;
    const accountId = params.get('accountId') || '';
    setEditingRowId(NEW_ROW_ID);
    setEditingValues({
      date: startOfMinute(new Date()),
      accountId,
      payee: '',
      categoryId: null,
      amount: '',
      notes: null
    });
  };

  const handleAddNew = () => {
    newTransaction.onOpen();
  };

  const onRowClick = (row: Row<ResponseType>) => {
    if (editingRowId) return;
    if (row.original.id === NEW_ROW_ID) return;
    if (row.original.type !== 'USER_CREATED' || row.original.isBillSplit) return;
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
      if (e.key === 'Escape') {
        cancelEditing();
        return;
      }
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
    accountOptions,
    categoryOptions,
    onCreateCategory,
    accounts,
    isSaving,
    payeeCategories
  };

  // Prepend a blank sentinel row when adding new
  const newRowSentinel: ResponseType = {
    id: NEW_ROW_ID,
    type: 'USER_CREATED',
    date: new Date() as unknown as string,
    category: null,
    payee: '',
    notes: null,
    amount: 0,
    accountId: '',
    categoryId: null,
    isBillSplit: false,
    account: '',
    accountCurrency: null as unknown as ResponseType['accountCurrency']
  };

  const tableData = editingRowId === NEW_ROW_ID ? [newRowSentinel, ...transactions] : transactions;

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
          <Button onClick={handleAddNew} disabled={!!editingRowId}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent className='flex flex-col flex-1 min-h-0 pb-4'>
          <DataTable
            columns={columns}
            data={tableData}
            renderMobileRow={mobileRow}
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
      <Transactions />
    </Suspense>
  );
};

export default Page;
