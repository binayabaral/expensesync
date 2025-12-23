import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { convertAmountToMiliUnits } from '@/lib/utils';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetAsset } from '@/features/assets/api/useGetAsset';
import { useSellAsset } from '@/features/assets/api/useSellAsset';
import { useOpenSellAssetSheet } from '@/features/assets/hooks/useOpenSellAssetSheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AmountInput } from '@/components/AmountInput';
import { Select } from '@/components/Select';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';

const formSchema = z.object({
  quantity: z
    .string()
    .min(1, 'Quantity is required')
    .refine(val => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: 'Quantity must be greater than 0'
    }),
  unitPrice: z
    .string()
    .min(1, 'Price is required')
    .refine(val => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be greater than 0'
    }),
  extraCharge: z
    .string()
    .optional()
    .refine(val => (val == null || val === '' ? true : !Number.isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Extra charge must be zero or positive'
    }),
  accountId: z.string().min(1, 'Account is required'),
  date: z.coerce.date(),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export const SellAssetSheet = () => {
  const { isOpen, onClose, id } = useOpenSellAssetSheet();
  const assetQuery = useGetAsset(id);
  const sellMutation = useSellAsset(id);

  const accountsQuery = useGetAccounts();
  const accountOptions =
    accountsQuery.data?.map(account => ({
      label: account.name,
      value: account.id
    })) ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: '',
      unitPrice: '',
      extraCharge: '',
      accountId: '',
      date: new Date(),
      notes: ''
    }
  });

  const [totalAmount, setTotalAmount] = useState('');

  const asset = assetQuery.data;

  // Reset the form when asset or sheet opens
  useEffect(() => {
    if (asset && isOpen) {
      form.reset({
        quantity: asset.quantity.toString(),
        unitPrice: '',
        accountId: '',
        date: new Date(),
        notes: ''
      });
      setTotalAmount('');
    }
  }, [asset, isOpen, form]);

  const watchedQuantity = form.watch('quantity');
  const watchedUnitPrice = form.watch('unitPrice');
  const watchedExtraCharge = form.watch('extraCharge');

  useEffect(() => {
    const qty = Number(watchedQuantity || '0');
    const price = Number(watchedUnitPrice || '0');
    const extra = Number(watchedExtraCharge || '0');
    const gross = qty * price;
    const net = gross - extra;

    if (!qty || qty <= 0 || !price || price <= 0 || Number.isNaN(net) || net <= 0) {
      setTotalAmount('');
    } else {
      setTotalAmount(net.toString());
    }
  }, [watchedQuantity, watchedUnitPrice, watchedExtraCharge]);

  const onSubmit = (values: FormValues) => {
    if (!asset) return;

    const qty = Number(values.quantity || '0');
    const maxQty = asset.quantity;

    if (qty > maxQty) {
      form.setError('quantity', { message: 'Cannot sell more than you own' });
      return;
    }

    const unitPrice = Number(values.unitPrice || '0');
    const extra = Number(values.extraCharge || '0');
    const gross = qty * unitPrice;
    const net = gross - extra;
    const amountMili = Math.round(convertAmountToMiliUnits(net));

    sellMutation.mutate(
      {
        accountId: values.accountId,
        amount: amountMili,
        quantity: qty,
        extraCharge: convertAmountToMiliUnits(extra),
        date: values.date,
        notes: values.notes
      },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  const isPending = sellMutation.isPending || assetQuery.isLoading || accountsQuery.isLoading;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>Sell Asset</SheetTitle>
          <SheetDescription>Sell all or part of this asset and deposit the amount into an account.</SheetDescription>
        </SheetHeader>
        {assetQuery.isLoading || accountsQuery.isLoading ? (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2 className='size-4 text-muted-foreground animate-spin' />
          </div>
        ) : !asset ? (
          <div className='text-sm text-muted-foreground'>Asset not found.</div>
        ) : (
          <form className='space-y-4' onSubmit={form.handleSubmit(onSubmit)}>
            <div className='text-sm text-muted-foreground'>
              Selling: <span className='font-medium'>{asset.name}</span> ({asset.type}) – Available quantity:{' '}
              <span className='font-medium'>
                {asset.quantity} {asset.unit}
              </span>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Date</label>
              <DateTimePicker
                value={form.watch('date')}
                hourCycle={12}
                onChange={value => form.setValue('date', value ?? new Date())}
                disabled={isPending}
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Account</label>
              <Select
                value={form.watch('accountId')}
                disabled={isPending}
                options={accountOptions}
                allowCreatingOptions={false}
                placeholder='Select Account'
                onChangeAction={value => form.setValue('accountId', value ?? '')}
              />
              {form.formState.errors.accountId && (
                <p className='text-xs text-destructive'>{form.formState.errors.accountId.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Quantity to Sell</label>
              <Input
                type='number'
                step='0.01'
                min='0'
                {...form.register('quantity')}
                disabled={isPending}
              />
              {form.formState.errors.quantity && (
                <p className='text-xs text-destructive'>{form.formState.errors.quantity.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Sell Price / Unit</label>
              <AmountInput
                value={watchedUnitPrice}
                onChange={value => form.setValue('unitPrice', value ?? '')}
                allowNegativeValue={false}
                disabled={isPending}
                placeholder='0.00'
              />
              {form.formState.errors.unitPrice && (
                <p className='text-xs text-destructive'>{form.formState.errors.unitPrice.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Extra Charges</label>
              <AmountInput
                value={watchedExtraCharge ?? ''}
                onChange={value => form.setValue('extraCharge', value ?? '')}
                allowNegativeValue={false}
                disabled={isPending}
                placeholder='0.00'
              />
              {form.formState.errors.extraCharge && (
                <p className='text-xs text-destructive'>{form.formState.errors.extraCharge.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Total Amount</label>
              <Input value={totalAmount} readOnly disabled placeholder='0.00' />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Notes</label>
              <Textarea rows={3} {...form.register('notes')} disabled={isPending} />
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button type='button' variant='outline' onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type='submit' disabled={isPending || !totalAmount}>
                Sell
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};



