import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Select } from '@/components/Select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AmountInput } from '@/components/AmountInput';
import { DEFAULT_CURRENCY, convertAmountToMiliUnits } from '@/lib/utils';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const editAccountSchema = z.object({
  name: z.string(),
  currency: z.string().optional(),
  isHidden: z.boolean(),
  accountType: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER']),
  creditLimit: z.string().optional().nullable(),
  apr: z.string().optional().nullable(),
  statementCloseMode: z.enum(['DAY', 'EOM']),
  statementCloseDay: z.string().optional().nullable(),
  paymentDueMode: z.enum(['DAY', 'DAYS']),
  paymentDueDay: z.string().optional().nullable(),
  paymentDueDays: z.string().optional().nullable(),
  minimumPaymentPercentage: z.string().optional().nullable(),
  loanSubType: z.enum(['EMI', 'PEER']).optional().nullable(),
  loanTenureMonths: z.string().optional().nullable(),
  emiIntervalMonths: z.string().optional().nullable()
});

type FormValues = z.infer<typeof editAccountSchema>;

type Props = {
  id?: string;
  isClosed?: boolean;
  disabled?: boolean;
  onDelete?: () => void;
  onCloseLoan?: () => void;
  defaultValues?: FormValues;
  onSubmit: (values: {
    name: string;
    isHidden: boolean;
    accountType: 'CASH' | 'BANK' | 'CREDIT_CARD' | 'LOAN' | 'OTHER';
    creditLimit?: number | null;
    apr?: number | null;
    statementCloseDay?: number | null;
    statementCloseIsEom?: boolean;
    paymentDueDay?: number | null;
    paymentDueDays?: number | null;
    minimumPaymentPercentage?: number;
    loanSubType?: 'EMI' | 'PEER' | null;
    loanTenureMonths?: number | null;
    emiIntervalMonths?: number;
  }) => void;
};

export const EditAccountForm = ({ id, isClosed, onSubmit, onDelete, onCloseLoan, disabled, defaultValues }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: defaultValues
  });

  const isMobileDevice = useIsMobile();
  const accountCurrency = form.watch('currency') ?? DEFAULT_CURRENCY;

  const handleSubmit = (values: FormValues) => {
    const isCreditCard = values.accountType === 'CREDIT_CARD';
    const isLoan = values.accountType === 'LOAN';
    const isEmi = isLoan && values.loanSubType === 'EMI';
    const creditLimit = isCreditCard && values.creditLimit ? convertAmountToMiliUnits(parseFloat(values.creditLimit)) : null;
    const apr = isCreditCard && values.apr ? parseFloat(values.apr) : isEmi && values.apr ? parseFloat(values.apr) : null;
    const minimumPaymentPercentage = isCreditCard && values.minimumPaymentPercentage
      ? parseFloat(values.minimumPaymentPercentage)
      : 2;
    const statementCloseIsEom = isCreditCard && values.statementCloseMode === 'EOM';
    const statementCloseDay =
      isCreditCard && values.statementCloseMode === 'DAY' && values.statementCloseDay
        ? parseInt(values.statementCloseDay, 10)
        : null;
    const paymentDueDay =
      (isCreditCard && values.paymentDueMode === 'DAY' && values.paymentDueDay)
        ? parseInt(values.paymentDueDay, 10)
        : isEmi && values.paymentDueDay
        ? parseInt(values.paymentDueDay, 10)
        : null;
    const paymentDueDays =
      isCreditCard && values.paymentDueMode === 'DAYS' && values.paymentDueDays
        ? parseInt(values.paymentDueDays, 10)
        : null;
    const loanSubType = isLoan ? (values.loanSubType ?? null) : null;
    const loanTenureMonths = isEmi && values.loanTenureMonths ? parseInt(values.loanTenureMonths, 10) : null;
    const emiIntervalMonths = isEmi && values.emiIntervalMonths ? parseInt(values.emiIntervalMonths, 10) : 1;

    onSubmit({
      name: values.name,
      isHidden: values.isHidden,
      accountType: values.accountType,
      creditLimit,
      apr,
      statementCloseDay,
      statementCloseIsEom,
      paymentDueDay,
      paymentDueDays,
      minimumPaymentPercentage,
      loanSubType,
      loanTenureMonths,
      emiIntervalMonths
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
        <FormField
          name='currency'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <div className='flex items-center h-9 px-3 py-2 border rounded-md bg-muted'>
                <Badge variant='secondary' className='font-mono'>{field.value ?? DEFAULT_CURRENCY}</Badge>
                <span className='ml-2 text-sm text-muted-foreground'>Currency cannot be changed after creation</span>
              </div>
            </FormItem>
          )}
        />
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
        <FormField
          name='accountType'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <FormControl>
                {isMobileDevice ? (
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
                      currency={accountCurrency}
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
                    {isMobileDevice ? (
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
                    {isMobileDevice ? (
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
        {form.watch('accountType') === 'LOAN' && (
          <>
            <FormField
              name='loanSubType'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Type</FormLabel>
                  <FormControl>
                    {isMobileDevice ? (
                      <NativeSelect value={field.value ?? ''} onChange={field.onChange} disabled={disabled} className='w-full'>
                        <NativeSelectOption value=''>Select type</NativeSelectOption>
                        <NativeSelectOption value='EMI'>EMI (Installment)</NativeSelectOption>
                        <NativeSelectOption value='PEER'>Peer (Person to person)</NativeSelectOption>
                      </NativeSelect>
                    ) : (
                      <Select
                        value={field.value ?? ''}
                        disabled={disabled}
                        allowCreatingOptions={false}
                        placeholder='Select loan type'
                        onChangeAction={field.onChange}
                        options={[
                          { label: 'EMI (Installment)', value: 'EMI' },
                          { label: 'Peer (Person to person)', value: 'PEER' }
                        ]}
                      />
                    )}
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch('loanSubType') === 'EMI' && (
              <>
                <FormField
                  name='apr'
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type='number'
                          step='0.01'
                          min='0'
                          disabled={disabled}
                          placeholder='12.5'
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  name='loanTenureMonths'
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenure (months) <span className='text-muted-foreground font-normal'>(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type='number'
                          min='1'
                          disabled={disabled}
                          placeholder='Leave blank for open-ended'
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  name='emiIntervalMonths'
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Frequency (months)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? '1'}
                          type='number'
                          min='1'
                          max='24'
                          disabled={disabled}
                          placeholder='1'
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  name='paymentDueDay'
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EMI Due Day of Month</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type='number'
                          min='1'
                          max='31'
                          disabled={disabled}
                          placeholder='15'
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
          </>
        )}
        <Button className='w-full' disabled={disabled}>
          {id ? 'Save Changes' : 'Create Account'}
        </Button>
        {!!id && form.watch('accountType') === 'LOAN' && !isClosed && (
          <Button
            type='button'
            disabled={disabled}
            onClick={onCloseLoan}
            className='w-full'
            variant='outline'
          >
            Archive Loan
          </Button>
        )}
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
