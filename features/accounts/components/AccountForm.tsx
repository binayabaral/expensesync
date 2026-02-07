import { z } from 'zod';
import isMobile from 'is-mobile';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Select } from '@/components/Select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AmountInput } from '@/components/AmountInput';
import { convertAmountToMiliUnits } from '@/lib/utils';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string(),
  isHidden: z.boolean(),
  startingBalance: z.string(),
  accountType: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER']),
  creditLimit: z.string().optional().nullable(),
  apr: z.string().optional().nullable(),
  statementCloseMode: z.enum(['DAY', 'EOM']),
  statementCloseDay: z.string().optional().nullable(),
  paymentDueMode: z.enum(['DAY', 'DAYS']),
  paymentDueDay: z.string().optional().nullable(),
  paymentDueDays: z.string().optional().nullable(),
  minimumPaymentPercentage: z.string().optional().nullable()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const apiSchema = z.object({
  name: z.string(),
  isHidden: z.boolean(),
  startingBalance: z.number(),
  accountType: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER']),
  creditLimit: z.number().nullable().optional(),
  apr: z.number().nullable().optional(),
  statementCloseDay: z.number().nullable().optional(),
  statementCloseIsEom: z.boolean().optional(),
  paymentDueDay: z.number().nullable().optional(),
  paymentDueDays: z.number().nullable().optional(),
  minimumPaymentPercentage: z.number().optional()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const editSchema = z.object({
  name: z.string(),
  isHidden: z.boolean(),
  accountType: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER']),
  creditLimit: z.number().nullable().optional(),
  apr: z.number().nullable().optional(),
  statementCloseDay: z.number().nullable().optional(),
  statementCloseIsEom: z.boolean().optional(),
  paymentDueDay: z.number().nullable().optional(),
  paymentDueDays: z.number().nullable().optional(),
  minimumPaymentPercentage: z.number().optional()
});

type FormValues = z.input<typeof formSchema>;
type ApiFormValues = z.input<typeof apiSchema>;
type EditFormValues = z.input<typeof editSchema>;

type Props = {
  id?: string;
  disabled?: boolean;
  onDelete?: () => void;
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: ApiFormValues) => void;
};

export const AccountForm = ({ id, onSubmit, onDelete, disabled, defaultValues }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const handleSubmit = (values: FormValues) => {
    const amountInMiliUnits = convertAmountToMiliUnits(parseFloat(values.startingBalance));
    const isCreditCard = values.accountType === 'CREDIT_CARD';
    const creditLimit = isCreditCard && values.creditLimit ? convertAmountToMiliUnits(parseFloat(values.creditLimit)) : null;
    const apr = isCreditCard && values.apr ? parseFloat(values.apr) : null;
    const minimumPaymentPercentage = isCreditCard && values.minimumPaymentPercentage
      ? parseFloat(values.minimumPaymentPercentage)
      : 2;
    const statementCloseIsEom = isCreditCard && values.statementCloseMode === 'EOM';
    const statementCloseDay =
      isCreditCard && values.statementCloseMode === 'DAY' && values.statementCloseDay
        ? parseInt(values.statementCloseDay, 10)
        : null;
    const paymentDueDay =
      isCreditCard && values.paymentDueMode === 'DAY' && values.paymentDueDay
        ? parseInt(values.paymentDueDay, 10)
        : null;
    const paymentDueDays =
      isCreditCard && values.paymentDueMode === 'DAYS' && values.paymentDueDays
        ? parseInt(values.paymentDueDays, 10)
        : null;

    onSubmit({
      name: values.name,
      isHidden: values.isHidden,
      startingBalance: amountInMiliUnits,
      accountType: values.accountType,
      creditLimit,
      apr,
      statementCloseDay,
      statementCloseIsEom,
      paymentDueDay,
      paymentDueDays,
      minimumPaymentPercentage
    });
  };

  const handleDelete = () => {
    onDelete?.();
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
                <Input disabled={disabled} placeholder='e.g. Cash, Bank, Credit Card' {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        {!id && (
          <FormField
            name='startingBalance'
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting Balance</FormLabel>
                <FormControl>
                  <AmountInput {...field} disabled={disabled} placeholder={'0.00'} />
                </FormControl>
              </FormItem>
            )}
          />
        )}
        <FormField
          name='accountType'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <FormControl>
                {isMobile() ? (
                  <NativeSelect value={field.value} onChange={field.onChange} disabled={disabled} className='w-full'>
                    <NativeSelectOption value='CASH'>Cash</NativeSelectOption>
                    <NativeSelectOption value='BANK'>Bank</NativeSelectOption>
                    <NativeSelectOption value='CREDIT_CARD'>Credit Card</NativeSelectOption>
                    <NativeSelectOption value='LOAN'>Loan</NativeSelectOption>
                    <NativeSelectOption value='OTHER'>Other</NativeSelectOption>
                  </NativeSelect>
                ) : (
                  <Select
                    value={field.value}
                    disabled={disabled}
                    allowCreatingOptions={false}
                    placeholder='Select account type'
                    onChangeAction={field.onChange}
                    options={[
                      { label: 'Cash', value: 'CASH' },
                      { label: 'Bank', value: 'BANK' },
                      { label: 'Credit Card', value: 'CREDIT_CARD' },
                      { label: 'Loan', value: 'LOAN' },
                      { label: 'Other', value: 'OTHER' }
                    ]}
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />
        {form.watch('accountType') === 'CREDIT_CARD' && (
          <>
            <FormField
              name='creditLimit'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Limit</FormLabel>
                  <FormControl>
                    <AmountInput
                      {...field}
                      value={field.value ?? ''}
                      disabled={disabled}
                      placeholder={'0.00'}
                      allowNegativeValue={false}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name='apr'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>APR (%)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type='number'
                      step='0.01'
                      min='0'
                      disabled={disabled}
                      placeholder='18.99'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name='statementCloseMode'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statement Close</FormLabel>
                  <FormControl>
                    {isMobile() ? (
                      <NativeSelect value={field.value} onChange={field.onChange} disabled={disabled} className='w-full'>
                        <NativeSelectOption value='DAY'>Day of Month</NativeSelectOption>
                        <NativeSelectOption value='EOM'>End of Month</NativeSelectOption>
                      </NativeSelect>
                    ) : (
                      <Select
                        value={field.value}
                        disabled={disabled}
                        allowCreatingOptions={false}
                        placeholder='Close date'
                        onChangeAction={field.onChange}
                        options={[
                          { label: 'Day of Month', value: 'DAY' },
                          { label: 'End of Month', value: 'EOM' }
                        ]}
                      />
                    )}
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch('statementCloseMode') === 'DAY' && (
              <FormField
                name='statementCloseDay'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statement Close Day</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type='number'
                        min='1'
                        max='31'
                        disabled={disabled}
                        placeholder='25'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <FormField
              name='paymentDueMode'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Due</FormLabel>
                  <FormControl>
                    {isMobile() ? (
                      <NativeSelect value={field.value} onChange={field.onChange} disabled={disabled} className='w-full'>
                        <NativeSelectOption value='DAY'>Day of Month</NativeSelectOption>
                        <NativeSelectOption value='DAYS'>Days After Close</NativeSelectOption>
                      </NativeSelect>
                    ) : (
                      <Select
                        value={field.value}
                        disabled={disabled}
                        allowCreatingOptions={false}
                        placeholder='Due date'
                        onChangeAction={field.onChange}
                        options={[
                          { label: 'Day of Month', value: 'DAY' },
                          { label: 'Days After Close', value: 'DAYS' }
                        ]}
                      />
                    )}
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch('paymentDueMode') === 'DAY' && (
              <FormField
                name='paymentDueDay'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Due Day</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type='number'
                        min='1'
                        max='31'
                        disabled={disabled}
                        placeholder='16'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            {form.watch('paymentDueMode') === 'DAYS' && (
              <FormField
                name='paymentDueDays'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days After Close</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type='number'
                        min='1'
                        max='60'
                        disabled={disabled}
                        placeholder='15'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <FormField
              name='minimumPaymentPercentage'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Payment (%)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type='number'
                      step='0.1'
                      min='0'
                      max='100'
                      disabled={disabled}
                      placeholder='2'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}
        <FormField
          name='isHidden'
          control={form.control}
          render={({ field }) => (
            <FormItem className='space-y-0 flex items-center'>
              <FormLabel className='mr-2'>Hide account balance from summary</FormLabel>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button className='w-full' disabled={disabled}>
          {id ? 'Save Changes' : 'Create Account'}
        </Button>
        {!!id && (
          <Button type='button' disabled={disabled} onClick={handleDelete} className='w-full' variant='outline'>
            <Trash className='size-4 mr-2' />
            Delete Account
          </Button>
        )}
      </form>
    </Form>
  );
};
