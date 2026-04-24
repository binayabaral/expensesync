'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { startOfMinute } from 'date-fns';
import { Row } from '@tanstack/react-table';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetTransfers } from '@/features/transfers/api/useGetTransfers';
import { useEditTransfer } from '@/features/transfers/api/useEditTransfer';
import { useCreateTransfer } from '@/features/transfers/api/useCreateTransfer';
import { useOpenAddTransferSheet } from '@/features/transfers/hooks/useOpenAddTransferSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { convertAmountToMiliUnits } from '@/lib/utils';

import { columns, mobileRow, buildEditingValues, EditingValues, ResponseType } from './columns';

const NEW_ROW_ID = '__new__';

function TransferPage() {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditingValues | null>(null);

  const openAddTransferSheet = useOpenAddTransferSheet();
  const transfersQuery = useGetTransfers();
  const transfers = transfersQuery.data || [];

  const accountsQuery = useGetAccounts();
  const accounts = accountsQuery.data ?? [];
  const accountOptions = accounts.map(a => ({ label: a.name, value: a.id }));

  const editMutation = useEditTransfer(editingRowId && editingRowId !== NEW_ROW_ID ? editingRowId : undefined);
  const createMutation = useCreateTransfer();

  const updateEditingValues = (patch: Partial<EditingValues>) => {
    setEditingValues(prev => (prev ? { ...prev, ...patch } : null));
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditingValues(null);
  };

  const saveEditing = () => {
    if (!editingValues) return;

    if (!editingValues.fromAccountId && !editingValues.toAccountId) {
      toast.error('Please select at least one account');
      return;
    }
    if (!editingValues.amount || parseFloat(editingValues.amount) === 0) {
      toast.error('Please enter an amount');
      return;
    }

    const payload = {
      date: new Date(editingValues.date),
      fromAccountId: editingValues.fromAccountId || null,
      toAccountId: editingValues.toAccountId || null,
      amount: convertAmountToMiliUnits(parseFloat(editingValues.amount)),
      transferCharge: convertAmountToMiliUnits(parseFloat(editingValues.transferCharge) || 0),
      notes: editingValues.notes,
      toAmount: editingValues.toAmount,
      creditCardStatementId: editingValues.creditCardStatementId
    };

    if (editingRowId === NEW_ROW_ID) {
      createMutation.mutate(
        { ...payload, toAmount: null, creditCardStatementId: null },
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
    setEditingRowId(NEW_ROW_ID);
    setEditingValues({
      date: startOfMinute(new Date()),
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      transferCharge: '0',
      notes: null,
      toAmount: null,
      creditCardStatementId: null
    });
  };

  const handleAddNew = () => {
    openAddTransferSheet.onOpen();
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
    accountOptions,
    accounts,
    isSaving
  };

  const newRowSentinel: ResponseType = {
    id: NEW_ROW_ID,
    date: new Date() as unknown as string,
    fromAccount: '',
    toAccount: '',
    amount: 0,
    toAmount: null,
    transferCharge: 0,
    notes: null,
    fromAccountCurrency: null,
    toAccountCurrency: null,
    fromAccountId: null,
    toAccountId: null,
    creditCardStatementId: null
  };

  const tableData = editingRowId === NEW_ROW_ID ? [newRowSentinel, ...transfers] : transfers;

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

export default function Page() {
  return (
    <Suspense>
      <TransferPage />
    </Suspense>
  );
}
