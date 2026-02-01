import { useState } from 'react';
import { ArrowUpDown, Edit, MoreHorizontal, Loader2, Trash } from 'lucide-react';
import { InferResponseType } from 'hono';
import { ColumnDef } from '@tanstack/react-table';

import { client } from '@/lib/hono';
import { cn, convertAmountFromMiliUnits, convertAmountToMiliUnits, formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AmountInput } from '@/components/AmountInput';
import { Select } from '@/components/Select';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetAsset } from '@/features/assets/api/useGetAsset';
import { DataTable } from '@/components/DataTable';
import { useGetAssetLots } from '../api/useGetAssetLots';
import { useOpenAssetLotsSheet } from '../hooks/useOpenAssetLotsSheet';
import { useEditAssetLot } from '../api/useEditAssetLot';
import { useDeleteAssetLot } from '../api/useDeleteAssetLot';

type LotResponse = InferResponseType<(typeof client.api.assets)[':id']['lots']['$get'], 200>['data'][0];

export const AssetLotsSheet = () => {
  const { isOpen, onClose, assetId } = useOpenAssetLotsSheet();
  const lotsQuery = useGetAssetLots(assetId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [assetPrice, setAssetPrice] = useState('');
  const [extraCharge, setExtraCharge] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const assetQuery = useGetAsset(assetId);

  const accountsQuery = useGetAccounts();
  const accountOptions =
    accountsQuery.data?.map(account => ({
      label: account.name,
      value: account.id
    })) ?? [];

  const editLotMutation = useEditAssetLot(editingId ?? undefined);
  const deleteLotMutation = useDeleteAssetLot(assetId ?? undefined);

  const lots = lotsQuery.data || [];
  const isLoading = lotsQuery.isLoading || editLotMutation.isPending;

  const totalPaidDisplay = (() => {
    const qtyNum = Number(quantity || '0');
    const priceNum = parseFloat(assetPrice || '0');
    const extraNum = parseFloat(extraCharge || '0');
    const total = qtyNum * priceNum + extraNum;

    if (!qtyNum || qtyNum <= 0 || Number.isNaN(total) || total <= 0) {
      return '';
    }

    return total.toString();
  })();

  const startEdit = (lot: LotResponse) => {
    setEditingId(lot.id);
    setQuantity(String(lot.quantity));
    setAssetPrice(convertAmountFromMiliUnits(lot.assetPrice).toString());
    setExtraCharge(convertAmountFromMiliUnits(lot.extraCharge).toString());
    setAccountId(lot.accountId);
    setDate(new Date(lot.date));
    setIsEditSheetOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setQuantity('');
    setAssetPrice('');
    setExtraCharge('');
    setAccountId('');
    setDate(undefined);
    setIsEditSheetOpen(false);
  };

  const saveEdit = () => {
    if (!editingId) return;

    const qtyNum = Number(quantity || '0');
    const priceNum = parseFloat(assetPrice || '0');
    const extraNum = parseFloat(extraCharge || '0');
    const effectiveDate = date ?? new Date();

    if (
      !qtyNum ||
      qtyNum <= 0 ||
      Number.isNaN(priceNum) ||
      Number.isNaN(extraNum) ||
      !accountId
    ) {
      return;
    }

    const assetPriceMili = Math.round(convertAmountToMiliUnits(priceNum));
    const extraChargeMili = Math.round(convertAmountToMiliUnits(extraNum));

    editLotMutation.mutate(
      {
        quantity: qtyNum,
        assetPrice: assetPriceMili,
        extraCharge: extraChargeMili,
        accountId,
        date: effectiveDate
      },
      {
        onSuccess: () => {
          cancelEdit();
          lotsQuery.refetch();
        }
      }
    );
  };

  if (!isOpen) {
    return null;
  }

  const columns: ColumnDef<LotResponse>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) => <span>{new Date(row.original.date).toLocaleString()}</span>
    },
    {
      accessorKey: 'account',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Account
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.account}</span>
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Quantity
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      )
    },
    {
      accessorKey: 'unit',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Unit
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      )
    },
    {
      accessorKey: 'assetPrice',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Bought Price / Unit
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.quantity > 0 ? formatCurrency(row.original.assetPrice) : '-' // only for buys
    },
    {
      accessorKey: 'sellPrice',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Sell Price / Unit
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.quantity < 0 && row.original.sellPrice != null
          ? formatCurrency(row.original.sellPrice)
          : '-'
    },
    {
      id: 'lotProfitLoss',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Profit / Loss
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      accessorFn: row => {
        if (row.quantity >= 0 || row.sellPrice == null) return 0;
        const saleAmount = row.sellPrice * Math.abs(row.quantity);
        const principal = -row.totalPaid;
        const fee = row.extraCharge ?? 0;
        return saleAmount - principal - fee;
      },
      cell: ({ row }) => {
        const lot = row.original;

        if (lot.quantity >= 0 || lot.sellPrice == null) {
          return '-';
        }

        const saleAmount = lot.sellPrice * Math.abs(lot.quantity);
        const principal = -lot.totalPaid;
        const fee = lot.extraCharge ?? 0;
        const profit = saleAmount - principal - fee;

        return (
          <span
            className={cn(
              'whitespace-nowrap',
              profit > 0 ? 'text-emerald-600 dark:text-emerald-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : ''
            )}
          >
            {formatCurrency(profit)}
          </span>
        );
      }
    },
    {
      accessorKey: 'extraCharge',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Extra Charges
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) => formatCurrency(row.original.extraCharge)
    },
    {
      accessorKey: 'totalPaid',
      header: ({ column }) => (
        <Button
          variant='ghost'
          className='px-3'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Total Paid
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      ),
      cell: ({ row }) => formatCurrency(row.original.totalPaid)
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='size-8 p-0'>
              <MoreHorizontal className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => startEdit(row.original)}>
              <Edit className='size-4 mr-2' />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteLotMutation.mutate(row.original.id)}>
              <Trash className='size-4 mr-2' />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>
          Asset Buys
          {assetQuery.data ? ` – ${assetQuery.data.name} (${assetQuery.data.type})` : ''}
        </h2>
        <Button variant='outline' size='sm' onClick={onClose}>
          Close
        </Button>
      </div>
      {isLoading ? (
        <div className='flex items-center justify-center py-10'>
          <Loader2 className='size-4 text-muted-foreground animate-spin' />
        </div>
      ) : (
        <DataTable
          data={lots}
          columns={columns}
          disabled={isLoading}
          hasFooter={false}
          onDeleteAction={() => undefined}
        />
      )}
      <Sheet open={isEditSheetOpen} onOpenChange={open => (!open ? cancelEdit() : null)}>
        <SheetContent className='space-y-4' tabIndex={undefined}>
          <SheetHeader>
            <SheetTitle>Edit Asset Buy</SheetTitle>
          </SheetHeader>
          <div className='space-y-4 pt-2'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Date</label>
              <DateTimePicker value={date} hourCycle={12} onChange={value => setDate(value)} disabled={false} />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Account</label>
              <Select
                value={accountId}
                disabled={accountsQuery.isLoading}
                options={accountOptions}
                allowCreatingOptions={false}
                placeholder='Select Account'
                onChangeAction={value => setAccountId(value ?? '')}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Quantity</label>
              <Input
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                type='number'
                step='0.01'
                min='0'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Bought Price / Unit</label>
              <AmountInput
                value={assetPrice}
                onChange={value => setAssetPrice(value ?? '')}
                allowNegativeValue={false}
                placeholder='0.00'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Extra Charges</label>
              <AmountInput
                value={extraCharge}
                onChange={value => setExtraCharge(value ?? '')}
                allowNegativeValue={false}
                placeholder='0.00'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Total Paid</label>
              <Input value={totalPaidDisplay} readOnly disabled placeholder='0.00' />
            </div>
            <div className='flex gap-2 pt-2'>
              <Button className='flex-1' onClick={saveEdit} disabled={editLotMutation.isPending}>
                Save
              </Button>
              <Button className='flex-1' variant='outline' onClick={cancelEdit} disabled={editLotMutation.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

