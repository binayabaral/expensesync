import { z } from 'zod';
import isMobile from 'is-mobile';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Select } from '@/components/Select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { convertAmountToMiliUnits } from '@/lib/utils';
import { AmountInput } from '@/components/AmountInput';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string(),
  type: z.enum(['TRANSACTION', 'TRANSFER']),
  cadence: z.enum(['DAILY', 'MONTHLY', 'YEARLY']),
  amount: z.string(),
  startDate: z.coerce.date(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  toAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

const monthOptions = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' }
];

const cadenceOptions = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' }
];

const typeOptions = [
  { label: 'Transaction', value: 'TRANSACTION' },
  { label: 'Transfer', value: 'TRANSFER' }
];

export type RecurringPaymentFormValues = z.input<typeof formSchema>;

export type RecurringPaymentApiValues = Omit<RecurringPaymentFormValues, 'amount'> & {
  amount: number;
};

type Props = {
  id?: string;
  disabled: boolean;
  onDelete?: () => void;
  defaultValues?: RecurringPaymentFormValues;
  onSubmit: (values: RecurringPaymentApiValues) => void;
  accountOptions: { label: string; value: string }[];
  categoryOptions: { label: string; value: string }[];
};

export const RecurringPaymentForm = ({
  id,
  disabled,
  onDelete,
  defaultValues,
  onSubmit,
  accountOptions,
  categoryOptions
}: Props) => {
  const form = useForm<RecurringPaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const cadence = form.watch('cadence');
  const type = form.watch('type');
  const isMobileDevice = isMobile();

  const handleSubmit = (values: RecurringPaymentFormValues) => {
    const amountInMiliUnits = convertAmountToMiliUnits(parseFloat(values.amount));
    onSubmit({
      ...values,
      amount: amountInMiliUnits,
      dayOfMonth: values.dayOfMonth || null,
      month: values.month || null,
      accountId: values.accountId || null,
      categoryId: values.categoryId || null,
      toAccountId: values.toAccountId || null
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4 pt-4'>
        <FormField
          name='name'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} disabled={disabled} placeholder='Netflix, Rent, etc.' />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name='type'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                {isMobileDevice ? (
                  <NativeSelect value={field.value} onChange={field.onChange} disabled={disabled} className='w-full'>
                    {typeOptions.map(option => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Select
                    value={field.value}
                    disabled={disabled}
                    options={typeOptions}
                    allowCreatingOptions={false}
                    placeholder='Select type'
                    onChangeAction={field.onChange}
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name='cadence'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cadence</FormLabel>
              <FormControl>
                {isMobileDevice ? (
                  <NativeSelect value={field.value} onChange={field.onChange} disabled={disabled} className='w-full'>
                    {cadenceOptions.map(option => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Select
                    value={field.value}
                    disabled={disabled}
                    options={cadenceOptions}
                    allowCreatingOptions={false}
                    placeholder='Select cadence'
                    onChangeAction={field.onChange}
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name='startDate'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <DateTimePicker hourCycle={12} value={field.value} onChange={field.onChange} disabled={disabled} />
              </FormControl>
            </FormItem>
          )}
        />

        {(cadence === 'MONTHLY' || cadence === 'YEARLY') && (
          <FormField
            name='dayOfMonth'
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Day of Month</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={1}
                    max={31}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={disabled}
                    placeholder='1-31'
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {cadence === 'YEARLY' && (
          <FormField
            name='month'
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Month</FormLabel>
                <FormControl>
                  {isMobileDevice ? (
                    <NativeSelect
                      value={field.value?.toString() ?? ''}
                      onChange={field.onChange}
                      disabled={disabled}
                      className='w-full'
                    >
                      <NativeSelectOption value=''>Select Month</NativeSelectOption>
                      {monthOptions.map(option => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Select
                      value={field.value?.toString() ?? ''}
                      disabled={disabled}
                      options={monthOptions}
                      allowCreatingOptions={false}
                      placeholder='Select month'
                      onChangeAction={field.onChange}
                    />
                  )}
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <FormField
          name='accountId'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{type === 'TRANSFER' ? 'Sender Account' : 'Account (optional)'}</FormLabel>
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

        {type === 'TRANSFER' && (
          <FormField
            name='toAccountId'
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiver Account</FormLabel>
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
        )}

        {type === 'TRANSACTION' && (
          <FormField
            name='categoryId'
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  {isMobileDevice ? (
                    <NativeSelect
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={disabled}
                      className='w-full'
                    >
                      <NativeSelectOption value=''>Select Category</NativeSelectOption>
                      {categoryOptions.map(option => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Select
                      value={field.value ?? ''}
                      disabled={disabled}
                      options={categoryOptions}
                      allowCreatingOptions={false}
                      placeholder='Select Category'
                      onChangeAction={field.onChange}
                    />
                  )}
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <FormField
          name='amount'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder={'0.00'} allowNegativeValue={false} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name='notes'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ''} disabled={disabled} placeholder='Add a note' />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name='isActive'
          control={form.control}
          render={({ field }) => (
            <FormItem className='flex items-center gap-2'>
              <FormControl>
                <Checkbox checked={field.value ?? true} onCheckedChange={field.onChange} disabled={disabled} />
              </FormControl>
              <FormLabel>Active</FormLabel>
            </FormItem>
          )}
        />

        <Button className='w-full' disabled={disabled}>
          {id ? 'Save Changes' : 'Create Recurring Payment'}
        </Button>
        {!!id && (
          <Button type='button' disabled={disabled} onClick={onDelete} className='w-full' variant='outline'>
            <Trash className='size-4 mr-2' />
            Delete Recurring Payment
          </Button>
        )}
      </form>
    </Form>
  );
};
