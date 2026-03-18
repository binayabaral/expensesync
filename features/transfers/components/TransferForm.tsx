import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AmountInput } from '@/components/AmountInput';
import { insertTransferSchema } from '@/db/schema';
import { DEFAULT_CURRENCY, convertAmountToMiliUnits, formatCurrency } from '@/lib/utils';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useGetCreditCardStatements } from '@/features/credit-cards/api/useGetCreditCardStatements';

const formSchema = z.object({
  amount: z.string(),
  date: z.date(),
  transferCharge: z.string(),
  exchangeRate: z.string().optional(),
  notes: z.string().nullable().optional(),
  toAccountId: z.string().nullable().optional(),
  fromAccountId: z.string().nullable().optional(),
  creditCardStatementId: z.string().nullable().optional()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const apiSchema = insertTransferSchema.omit({
  id: true,
  userId: true
});

type FormValues = z.infer<typeof formSchema>;
type ApiFormValues = z.infer<typeof apiSchema>;

type Props = {
  id?: string;
  disabled: boolean;
  onDelete?: () => void;
  defaultValues?: FormValues;
  onSubmit: (values: ApiFormValues) => void;
  accountOptions: { label: string; value: string }[];
  accounts: { id: string; name: string; accountType?: string | null; currency?: string | null }[];
};

/**
 * Converts a sent amount to the destination amount given a rate expressed as
 * "1 foreign = rate NPR".
 *
 * - NPR → foreign: divide by rate (1 foreign = rate NPR → 1 NPR = 1/rate foreign)
 * - foreign → anything: multiply by rate
 *
 * Returns null when inputs are invalid or the rate is zero.
 */
function computeRawToAmount(amount: number, rate: number, fromCurrency: string): number | null {
  if (Number.isNaN(amount) || Number.isNaN(rate) || rate === 0) return null;
  return fromCurrency === DEFAULT_CURRENCY ? amount / rate : amount * rate;
}

export const TransferForm = ({ id, onSubmit, onDelete, disabled, defaultValues, accountOptions, accounts }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const toAccountId = form.watch('toAccountId');
  const fromAccountId = form.watch('fromAccountId');
  const watchedAmount = form.watch('amount');
  const watchedExchangeRate = form.watch('exchangeRate');

  const selectedFromAccount = accounts.find(account => account.id === fromAccountId);
  const selectedToAccount = accounts.find(account => account.id === toAccountId);

  const isCreditCard = selectedToAccount?.accountType === 'CREDIT_CARD';
  const fromCurrency = selectedFromAccount?.currency ?? DEFAULT_CURRENCY;
  const toCurrency = selectedToAccount?.currency ?? DEFAULT_CURRENCY;
  const isCrossCurrency = !!fromAccountId && !!toAccountId && fromCurrency !== toCurrency;

  // Rate label: always "1 [foreign] = X NPR" for NPR pairs; "1 from = X to" for foreign pairs
  const foreignCurrency = fromCurrency !== DEFAULT_CURRENCY ? fromCurrency : toCurrency;
  const rateLabel =
    fromCurrency === DEFAULT_CURRENCY || toCurrency === DEFAULT_CURRENCY
      ? `1 ${foreignCurrency} = {rate} ${DEFAULT_CURRENCY}`
      : `1 ${fromCurrency} = {rate} ${toCurrency}`;

  const previewToAmount = useMemo(() => {
    if (!isCrossCurrency) return null;
    const amt = parseFloat(watchedAmount || '0');
    const rate = parseFloat(watchedExchangeRate || '0');
    const raw = computeRawToAmount(amt, rate, fromCurrency);
    // Round to 10 decimal places to eliminate floating-point noise (e.g. 7302.5 / 146.05 = 49.9999... → 50)
    return raw !== null ? parseFloat(raw.toFixed(10)) : null;
  }, [isCrossCurrency, watchedAmount, watchedExchangeRate, fromCurrency]);

  const statementQuery = useGetCreditCardStatements({
    accountId: isCreditCard ? toAccountId ?? undefined : undefined,
    status: id ? undefined : 'unpaid'
  });

  const statementOptions = useMemo(
    () =>
      (statementQuery.data ?? []).map(statement => ({
        value: statement.id,
        label: `Statement ${format(new Date(statement.statementDate), 'MMM dd')} · Due ${format(
          new Date(statement.dueDate),
          'MMM dd'
        )} · ${formatCurrency(statement.paymentDueAmount)}`
      })),
    [statementQuery.data]
  );

  const requiresStatementSelection =
    !id && isCreditCard && statementOptions.length > 0 && !form.watch('creditCardStatementId');

  const handleSubmit = (values: FormValues) => {
    const amountInMiliUnits = convertAmountToMiliUnits(parseFloat(values.amount));
    const transferChargeInMiliUnits = convertAmountToMiliUnits(parseFloat(values.transferCharge));

    const toAmountInMiliUnits = (() => {
      if (!isCrossCurrency || !values.exchangeRate) return null;
      const rawToAmount = computeRawToAmount(
        parseFloat(values.amount),
        parseFloat(values.exchangeRate),
        fromCurrency
      );
      return rawToAmount !== null ? Math.round(convertAmountToMiliUnits(rawToAmount)) : null;
    })();

    onSubmit({
      ...values,
      fromAccountId: values.fromAccountId || null,
      toAccountId: values.toAccountId || null,
      creditCardStatementId: values.creditCardStatementId ? values.creditCardStatementId : null,
      amount: amountInMiliUnits,
      date: new Date(values.date),
      transferCharge: transferChargeInMiliUnits,
      toAmount: toAmountInMiliUnits
    });
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
          name='fromAccountId'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sender Account</FormLabel>
              <FormControl>
                <ResponsiveSelect
                  value={field.value ?? ''}
                  options={accountOptions}
                  placeholder='Select Account'
                  disabled={disabled}
                  onChangeAction={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='toAccountId'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receiver Account</FormLabel>
              <FormControl>
                <ResponsiveSelect
                  value={field.value ?? ''}
                  options={accountOptions}
                  placeholder='Select Account'
                  disabled={disabled}
                  onChangeAction={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='amount'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isCrossCurrency ? `Amount Sent (${fromCurrency})` : 'Amount'}</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder='0.00' allowNegativeValue={false} currency={fromCurrency} />
              </FormControl>
            </FormItem>
          )}
        />
        {isCrossCurrency && (
          <>
            <FormField
              name='exchangeRate'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Exchange Rate (1 {foreignCurrency} ={' '}
                    {fromCurrency === DEFAULT_CURRENCY || toCurrency === DEFAULT_CURRENCY ? DEFAULT_CURRENCY : toCurrency})
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type='number'
                      step='any'
                      min='0'
                      disabled={disabled}
                      placeholder={`e.g. ${foreignCurrency === 'USD' ? '135' : '1.00'}`}
                    />
                  </FormControl>
                  {watchedExchangeRate && parseFloat(watchedExchangeRate) > 0 && (
                    <p className='text-xs text-muted-foreground'>
                      {rateLabel.replace('{rate}', watchedExchangeRate)}
                    </p>
                  )}
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Amount to Receive ({toCurrency})</FormLabel>
              <AmountInput
                value={previewToAmount !== null ? previewToAmount.toString() : ''}
                onChange={() => {}}
                disabled
                placeholder='Calculated from exchange rate'
                allowNegativeValue={false}
                currency={toCurrency}
              />
            </FormItem>
          </>
        )}
        <FormField
          name='transferCharge'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extra Charges (Transfer fees / Interest Amount)</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder='0.00' currency={fromCurrency} />
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
        {isCreditCard && statementOptions.length > 0 && (
          <FormField
            name='creditCardStatementId'
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apply Payment To</FormLabel>
                <FormControl>
                  <ResponsiveSelect
                    value={field.value ?? ''}
                    options={statementOptions}
                    placeholder='Select Statement'
                    disabled={disabled}
                    onChangeAction={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
        {isCreditCard && statementOptions.length === 0 && (
          <div className='text-sm text-muted-foreground'>No open statements to apply.</div>
        )}
        {requiresStatementSelection && (
          <div className='text-sm text-destructive'>Please select a statement to apply this payment.</div>
        )}
        <Button className='w-full' disabled={disabled || requiresStatementSelection}>
          {id ? 'Save Changes' : 'Create Transfer'}
        </Button>
        {!!id && (
          <Button type='button' disabled={disabled} onClick={onDelete} className='w-full' variant='outline'>
            <Trash className='size-4 mr-2' />
            Delete Transfer
          </Button>
        )}
      </form>
    </Form>
  );
};
