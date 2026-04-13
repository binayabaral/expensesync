'use client';

import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
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

export type ResponseType = InferResponseType<typeof client.api.transfers.$get, 200>['data'][0];

export type EditingValues = {
  date: Date;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transferCharge: string;
  notes: string | null;
  toAmount: number | null;
  creditCardStatementId: string | null;
};

export type TransferTableMeta = {
  editingRowId: string | null;
  editingValues: EditingValues | null;
  updateEditingValues: (patch: Partial<EditingValues>) => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  startEditingById: (id: string, values: EditingValues) => void;
  accountOptions: { label: string; value: string }[];
  accounts: { id: string; currency?: string | null }[];
  isSaving: boolean;
};

export function buildEditingValues(t: ResponseType): EditingValues {
  return {
    date: new Date(t.date),
    fromAccountId: t.fromAccountId ?? '',
    toAccountId: t.toAccountId ?? '',
    amount: convertAmountFromMiliUnits(t.amount).toString(),
    transferCharge: convertAmountFromMiliUnits(t.transferCharge ?? 0).toString(),
    notes: t.notes ?? null,
    toAmount: t.toAmount ?? null,
    creditCardStatementId: t.creditCardStatementId ?? null
  };
}

export const columns: ColumnDef<ResponseType>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <SortableHeader column={column} label='Date' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransferTableMeta | undefined;
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
    accessorKey: 'fromAccount',
    header: ({ column }) => <SortableHeader column={column} label='Sender Account' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransferTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-35'>
            <ResponsiveSelect
              value={meta.editingValues.fromAccountId}
              options={meta.accountOptions}
              placeholder='Sender Account'
              disabled={meta.isSaving}
              onChangeAction={v => meta.updateEditingValues({ fromAccountId: v })}
            />
          </div>
        );
      }

      return <span>{row.original.fromAccount}</span>;
    }
  },
  {
    accessorKey: 'toAccount',
    header: ({ column }) => <SortableHeader column={column} label='Receiver Account' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransferTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-35'>
            <ResponsiveSelect
              value={meta.editingValues.toAccountId}
              options={meta.accountOptions}
              placeholder='Receiver Account'
              disabled={meta.isSaving}
              onChangeAction={v => meta.updateEditingValues({ toAccountId: v })}
            />
          </div>
        );
      }

      return <span>{row.original.toAccount}</span>;
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <SortableHeader column={column} label='Amount' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransferTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        const currency = meta.accounts.find(a => a.id === meta.editingValues!.fromAccountId)?.currency ?? DEFAULT_CURRENCY;
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
      const fromCurrency = row.original.fromAccountCurrency ?? DEFAULT_CURRENCY;
      const toCurrency = row.original.toAccountCurrency ?? DEFAULT_CURRENCY;
      const toAmount = row.original.toAmount;
      const isCross = toAmount !== null && toAmount !== undefined && fromCurrency !== toCurrency;

      return (
        <span className='flex flex-col gap-0.5'>
          <span className={cn('whitespace-nowrap', amount < 0 ? 'text-destructive' : 'text-primary')}>
            {formatCurrency(amount, false, fromCurrency)}
          </span>
          {isCross && (
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              → {formatCurrency(toAmount!, false, toCurrency)}
            </span>
          )}
        </span>
      );
    }
  },
  {
    accessorKey: 'transferCharge',
    header: ({ column }) => <SortableHeader column={column} label='Extra Charges' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransferTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing && meta?.editingValues) {
        const currency = meta.accounts.find(a => a.id === meta.editingValues!.fromAccountId)?.currency ?? DEFAULT_CURRENCY;
        return (
          <div onClick={e => e.stopPropagation()} className='min-w-35 [&_p]:hidden'>
            <AmountInput
              value={meta.editingValues.transferCharge}
              onChange={v => meta.updateEditingValues({ transferCharge: v ?? '0' })}
              disabled={meta.isSaving}
              placeholder='0.00'
              currency={currency}
              allowNegativeValue={false}
            />
          </div>
        );
      }

      const charge = parseFloat(row.getValue('transferCharge'));
      const fromCurrency = row.original.fromAccountCurrency ?? DEFAULT_CURRENCY;

      return (
        <span className={cn('whitespace-nowrap', charge === 0 ? 'text-muted-foreground' : charge < 0 ? 'text-primary' : 'text-destructive')}>
          {formatCurrency(charge, false, fromCurrency)}
        </span>
      );
    }
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => <SortableHeader column={column} label='Notes' />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransferTableMeta | undefined;
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
      const meta = table.options.meta as TransferTableMeta | undefined;
      const isEditing = meta?.editingRowId === row.original.id;

      if (isEditing) {
        return (
          <div onClick={e => e.stopPropagation()} className='flex items-center gap-1'>
            <Button size='sm' onClick={meta?.saveEditing} disabled={meta?.isSaving} className='h-8 w-8 p-0'>
              <Check className='size-4' />
            </Button>
            <Button size='sm' variant='ghost' onClick={meta?.cancelEditing} disabled={meta?.isSaving} className='h-8 w-8 p-0'>
              <X className='size-4' />
            </Button>
          </div>
        );
      }

      return (
        <div onClick={e => e.stopPropagation()}>
          <Actions
            id={row.original.id}
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
  const fromCurrency = t.fromAccountCurrency ?? DEFAULT_CURRENCY;
  const toCurrency = t.toAccountCurrency ?? DEFAULT_CURRENCY;
  const isCross = t.toAmount !== null && t.toAmount !== undefined && fromCurrency !== toCurrency;
  const charge = parseFloat(String(t.transferCharge));

  return (
    <div className='flex items-start gap-3 px-3 py-2'>
      <div className='flex-1'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-sm font-medium'>
            {t.fromAccount} → {t.toAccount}
          </span>
          <div className='text-right shrink-0'>
            <span className={cn('text-sm font-semibold tabular-nums', amount < 0 ? 'text-destructive' : 'text-primary')}>
              {formatCurrency(amount, false, fromCurrency)}
            </span>
            {isCross && (
              <div className='text-xs text-muted-foreground tabular-nums'>
                → {formatCurrency(t.toAmount!, false, toCurrency)}
              </div>
            )}
          </div>
        </div>
        <div className='flex flex-wrap gap-x-1 mt-0.5 text-xs text-muted-foreground'>
          {t.notes && <span>{t.notes}</span>}
          {charge !== 0 && (
            <span className={cn(charge < 0 ? 'text-primary' : 'text-destructive')}>
              {t.notes ? '· ' : ''}{formatCurrency(charge, false, fromCurrency)} charges
            </span>
          )}
          {charge === 0 && !t.notes && <span>—</span>}
        </div>
        <div className='mt-0.5 text-xs text-muted-foreground'>
          {format(new Date(t.date), 'dd MMMM, yyyy hh:mm a')}
        </div>
      </div>
      <div className='shrink-0 mt-0.5'>
        <Actions id={t.id} />
      </div>
    </div>
  );
}
