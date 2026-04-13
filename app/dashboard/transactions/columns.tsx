'use client';

import { format } from 'date-fns';
import { Check, X, TriangleAlert } from 'lucide-react';
import { InferResponseType } from 'hono';
import { ColumnDef, Row } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { DEFAULT_CURRENCY, cn, convertAmountFromMiliUnits, formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AmountInput } from '@/components/AmountInput';
import { SortableHeader } from '@/components/SortableHeader';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';
import { DateInputWithPicker } from '@/components/DateInputWithPicker';

import { Actions } from './Actions';

export type ResponseType = InferResponseType<typeof client.api.transactions.$get, 200>['data'][0];

export type EditingValues = {
  date: Date;
  accountId: string;
  payee: string;
  categoryId: string | null;
  amount: string;
  notes: string | null;
};

export type TransactionTableMeta = {
  editingRowId: string | null;
  editingValues: EditingValues | null;
  updateEditingValues: (patch: Partial<EditingValues>) => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  startEditingById: (id: string, values: EditingValues) => void;
  accountOptions: { label: string; value: string }[];
  categoryOptions: { label: string; value: string }[];
  onCreateCategory: (name: string) => void;
  accounts: { id: string; currency?: string | null }[];
  isSaving: boolean;
  payeeCategories: Record<string, string>;
};

export function buildEditingValues(t: ResponseType): EditingValues {
  return {
    date: new Date(t.date),
    accountId: t.accountId,
    payee: t.payee ?? '',
    categoryId: t.categoryId ?? null,
    amount: convertAmountFromMiliUnits(t.amount).toString(),
    notes: t.notes ?? null
  };
}

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <SortableHeader column={column} label='Date' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-50'>
            <DateInputWithPicker
              value={meta.editingValues.date}
              onChangeAction={date => meta.updateEditingValues({ date })}
              disabled={meta.isSaving}
            />
          </div>
        );
      }

      return <span>{format(row.getValue('date') as Date, 'dd MMMM, yyyy hh:mm a')}</span>;
    }
  },
  {
    accessorKey: 'account',
    header: ({ column }) => <SortableHeader column={column} label='Account' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-35'>
            <ResponsiveSelect
              value={meta.editingValues.accountId}
              options={meta.accountOptions}
              placeholder='Select Account'
              disabled={meta.isSaving}
              onChangeAction={v => meta.updateEditingValues({ accountId: v })}
            />
          </div>
        );
      }

      return <span>{row.original.account}</span>;
    }
  },
  {
    accessorKey: 'payee',
    header: ({ column }) => <SortableHeader column={column} label='Payee' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-30'>
            <Input
              value={meta.editingValues.payee}
              onChange={e => meta.updateEditingValues({ payee: e.target.value })}
              onBlur={e => {
                const payee = e.target.value;
                if (payee && !meta.editingValues!.categoryId && meta.payeeCategories[payee]) {
                  meta.updateEditingValues({ categoryId: meta.payeeCategories[payee] });
                }
              }}
              disabled={meta.isSaving}
              placeholder='Add a payee'
            />
          </div>
        );
      }

      return <span>{row.original.payee}</span>;
    }
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <SortableHeader column={column} label='Category' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-35'>
            <ResponsiveSelect
              value={meta.editingValues.categoryId ?? ''}
              options={meta.categoryOptions}
              placeholder='Select Category'
              disabled={meta.isSaving}
              allowCreatingOptions
              onCreate={meta.onCreateCategory}
              onChangeAction={v => meta.updateEditingValues({ categoryId: v || null })}
            />
          </div>
        );
      }

      return (
        <div>
          {row.original.type !== 'USER_CREATED' ? (
            <span>N/A</span>
          ) : row.original.category ? (
            <span>{row.original.category}</span>
          ) : (
            <span className='flex items-center text-destructive'>
              <TriangleAlert className='size-4 mr-2' />
              Not Categorized
            </span>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <SortableHeader column={column} label='Amount' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        const currency = meta.accounts.find(a => a.id === meta.editingValues!.accountId)?.currency ?? DEFAULT_CURRENCY;
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-35 [&_p]:hidden'>
            <AmountInput
              value={meta.editingValues.amount}
              onChange={v => meta.updateEditingValues({ amount: v ?? '' })}
              disabled={meta.isSaving}
              placeholder='0.00'
              currency={currency}
            />
          </div>
        );
      }

      const amount = parseFloat(row.getValue('amount'));
      const currency = row.original.accountCurrency ?? DEFAULT_CURRENCY;

      return (
        <span className={cn('whitespace-nowrap', amount < 0 ? 'text-destructive' : 'text-primary')}>
          {formatCurrency(amount, false, currency)}
        </span>
      );
    }
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => <SortableHeader column={column} label='Notes' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-30'>
            <Input
              value={meta.editingValues.notes ?? ''}
              onChange={e => meta.updateEditingValues({ notes: e.target.value || null })}
              disabled={meta.isSaving}
              placeholder='Add a note'
            />
          </div>
        );
      }

      return <span>{row.original.notes}</span>;
    }
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;
      const isDisabled = row.original.type !== 'USER_CREATED' || !!row.original.isBillSplit;

      if (isEditing) {
        return (
          <div onClick={e => e.stopPropagation()} className='flex items-center gap-1'>
            <Button
              size='sm'
              onClick={meta?.saveEditing}
              disabled={meta?.isSaving}
              className='h-8 w-8 p-0'
            >
              <Check className='size-4' />
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={meta?.cancelEditing}
              disabled={meta?.isSaving}
              className='h-8 w-8 p-0'
            >
              <X className='size-4' />
            </Button>
          </div>
        );
      }

      return (
        <div onClick={e => e.stopPropagation()}>
          <Actions
            id={row.original.id}
            isDisabled={isDisabled}
            onEditAction={() => meta?.startEditingById(row.original.id, buildEditingValues(row.original))}
          />
        </div>
      );
    }
  }
];

export function mobileRow(row: Row<ResponseType>) {
  const t = row.original;
  const amount = parseFloat(String(t.amount));
  const currency = t.accountCurrency ?? DEFAULT_CURRENCY;

  return (
    <div className='flex items-start gap-3 px-3 py-2'>
      <div className='flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-sm font-medium'>{t.payee || '—'}</span>
          <span className={cn('text-sm font-semibold shrink-0 tabular-nums', amount < 0 ? 'text-destructive' : 'text-primary')}>
            {formatCurrency(amount, false, currency)}
          </span>
        </div>
        <div className='flex flex-wrap gap-x-1 mt-0.5 text-xs text-muted-foreground'>
          {t.account && <span>{t.account}</span>}
          {t.type !== 'USER_CREATED' ? (
            <span>· N/A</span>
          ) : t.category ? (
            <span>· {t.category}</span>
          ) : (
            <span className='flex items-center gap-0.5 text-destructive'>
              · <TriangleAlert className='size-3' /> Uncategorized
            </span>
          )}
        </div>
        <div className='mt-0.5 text-xs text-muted-foreground'>
          {format(new Date(t.date), 'dd MMMM, yyyy hh:mm a')}
        </div>
      </div>
      <div className='shrink-0 mt-0.5'>
        <Actions id={t.id} isDisabled={t.type !== 'USER_CREATED' || !!t.isBillSplit} />
      </div>
    </div>
  );
}
