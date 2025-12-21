import { useEffect } from 'react';
import { z } from 'zod';
import isMobile from 'is-mobile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Select } from '@/components/Select';
import { Button } from '@/components/ui/button';
import { AmountInput } from '@/components/AmountInput';
import { convertAmountToMiliUnits } from '@/lib/utils';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { insertAssetSchema } from '@/db/schema';

const baseSchema = insertAssetSchema.omit({
  id: true,
  userId: true,
  buyTransactionId: true,
  sellTransactionId: true,
  isSold: true,
  soldAt: true,
  sellAmount: true,
  createdAt: true,
  updatedAt: true
});

const formSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    type: z.string().min(1, 'Type is required'),
    quantity: z.string(),
    unit: z.string().min(1, 'Unit is required'),
    assetPrice: z.string(),
    extraCharge: z.string(),
    totalPaid: z.string(),
    accountId: z.string(),
    date: z.coerce.date()
  })
  .refine(
    values => {
      const { type, unit } = values;

      if (type === 'GOLD_22K' || type === 'GOLD_24K' || type === 'SILVER') {
        return unit === 'tola';
      }

      if (type === 'STOCK') {
        return unit === 'kitta';
      }

      return true;
    },
    {
      path: ['unit'],
      message: 'Invalid unit for the selected asset type'
    }
  )
  .refine(
    values => {
      const quantityNumber = Number(values.quantity || '0');

      if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
        return false;
      }

      if (values.type === 'STOCK') {
        return Number.isInteger(quantityNumber);
      }

      // GOLD_22K, GOLD_24K, SILVER can be decimal
      return true;
    },
    {
      path: ['quantity'],
      message: 'Quantity must be positive, and whole numbers only for stocks'
    }
  );

type FormValues = z.input<typeof formSchema>;
type ApiFormValues = z.input<typeof baseSchema> & { date: Date };

type Props = {
  disabled: boolean;
  defaultValues: FormValues;
  accountOptions: { label: string; value: string }[];
  onSubmit: (values: ApiFormValues & { date: Date }) => void;
};

export const AssetForm = ({ disabled, defaultValues, accountOptions, onSubmit }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const isMobileDevice = isMobile();
  const selectedType = form.watch('type');
  const watchedQuantity = form.watch('quantity');
  const watchedAssetPrice = form.watch('assetPrice');
  const watchedExtraCharge = form.watch('extraCharge');

  useEffect(() => {
    // Reset unit when type changes so the user is forced to pick a valid option
    form.setValue('unit', '');
  }, [selectedType, form]);

  useEffect(() => {
    const quantityNumber = Number(watchedQuantity || '0') || 0;
    const priceNumber = parseFloat(watchedAssetPrice || '0') || 0;
    const extraChargeNumber = parseFloat(watchedExtraCharge || '0') || 0;

    const total = quantityNumber * priceNumber + extraChargeNumber;
    const roundedTotal = Math.round(total);

    if (Number.isNaN(roundedTotal) || roundedTotal <= 0) {
      form.setValue('totalPaid', '');
    } else {
      form.setValue('totalPaid', roundedTotal.toString());
    }
  }, [watchedQuantity, watchedAssetPrice, watchedExtraCharge, form]);

  const unitOptions =
    selectedType === 'GOLD_22K' || selectedType === 'GOLD_24K' || selectedType === 'SILVER'
      ? [
          { label: 'Tola', value: 'tola' }
        ]
      : selectedType === 'STOCK'
        ? [{ label: 'Kitta', value: 'kitta' }]
        : [];

  const handleSubmit = (values: FormValues) => {
    const quantity = Number(values.quantity || '0');
    const assetPrice = convertAmountToMiliUnits(parseFloat(values.assetPrice || '0'));
    const extraCharge = convertAmountToMiliUnits(parseFloat(values.extraCharge || '0'));
    const totalPaid = convertAmountToMiliUnits(parseFloat(values.totalPaid || '0'));

    onSubmit({
      name: values.name,
      type: values.type as any,
      quantity,
      unit: values.unit,
      assetPrice,
      extraCharge,
      totalPaid,
      accountId: values.accountId,
      date: new Date(values.date)
    } as ApiFormValues & { date: Date });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4 pt-4'>
        <FormField
          name='date'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DateTimePicker hourCycle={12} value={field.value} onChange={field.onChange} disabled={disabled} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='accountId'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                {isMobileDevice ? (
                  <NativeSelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={disabled}
                    className='w-full'
                  >
                    <NativeSelectOption value=''>Select Account</NativeSelectOption>
                    {accountOptions.map(option => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Select
                    value={field.value ?? ''}
                    disabled={disabled}
                    options={accountOptions}
                    allowCreatingOptions={false}
                    placeholder='Select Account'
                    onChangeAction={field.onChange}
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='name'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Name</FormLabel>
              <FormControl>
                <input
                  {...field}
                  disabled={disabled}
                  className='w-full border rounded px-3 py-2 text-sm'
                  placeholder='e.g. 22K Gold, AAPL'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='type'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Type</FormLabel>
              <FormControl>
                {isMobileDevice ? (
                  <NativeSelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={disabled}
                    className='w-full'
                  >
                    <NativeSelectOption value=''>Select Type</NativeSelectOption>
                    <NativeSelectOption value='GOLD_22K'>Gold (22K)</NativeSelectOption>
                    <NativeSelectOption value='GOLD_24K'>Gold (24K)</NativeSelectOption>
                    <NativeSelectOption value='SILVER'>Silver</NativeSelectOption>
                    <NativeSelectOption value='STOCK'>Stock</NativeSelectOption>
                  </NativeSelect>
                ) : (
                  <Select
                    value={field.value ?? ''}
                    disabled={disabled}
                    options={[
                      { label: 'Gold (22K)', value: 'GOLD_22K' },
                      { label: 'Gold (24K)', value: 'GOLD_24K' },
                      { label: 'Silver', value: 'SILVER' },
                      { label: 'Stock', value: 'STOCK' }
                    ]}
                    allowCreatingOptions={false}
                    placeholder='Select Type'
                    onChangeAction={field.onChange}
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='quantity'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <input
                  {...field}
                  disabled={disabled}
                  className='w-full border rounded px-3 py-2 text-sm'
                  placeholder='e.g. grams or units'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='unit'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                {isMobileDevice ? (
                  <NativeSelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={disabled || unitOptions.length === 0}
                    className='w-full'
                  >
                    <NativeSelectOption value=''>
                      {selectedType ? 'Select Unit' : 'Select type first'}
                    </NativeSelectOption>
                    {unitOptions.map(option => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Select
                    value={field.value ?? ''}
                    disabled={disabled || unitOptions.length === 0}
                    options={unitOptions}
                    allowCreatingOptions={false}
                    placeholder={selectedType ? 'Select Unit' : 'Select type first'}
                    onChangeAction={field.onChange}
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='assetPrice'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Price (per unit)</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder='0.00' allowNegativeValue={false} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='extraCharge'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extra Charge (fees, making charges)</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder='0.00' allowNegativeValue={false} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='totalPaid'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Paid</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled placeholder='0.00' allowNegativeValue={false} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button className='w-full' disabled={disabled}>
          Add Asset
        </Button>
      </form>
    </Form>
  );
};


