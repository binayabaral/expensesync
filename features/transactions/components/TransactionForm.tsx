import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { insertTransactionSchema } from '@/db/schema';
import { DEFAULT_CURRENCY, convertAmountToMiliUnits } from '@/lib/utils';
import { AmountInput } from '@/components/AmountInput';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const formSchema = z.object({
  payee: z.string(),
  amount: z.string(),
  date: z.coerce.date(),
  accountId: z.string(),
  notes: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const apiSchema = insertTransactionSchema.omit({
  id: true
});

type FormValues = z.input<typeof formSchema>;
type ApiFormValues = z.input<typeof apiSchema>;

type Props = {
  id?: string;
  disabled: boolean;
  onDelete?: () => void;
  defaultValues?: FormValues;
  onCreateCategory: (name: string) => void;
  onSubmit: (values: ApiFormValues) => void;
  accountOptions: { label: string; value: string }[];
  categoryOptions: { label: string; value: string }[];
  accounts?: { id: string; currency?: string | null }[];
};

export const TransactionForm = ({
  id,
  onSubmit,
  onDelete,
  disabled,
  defaultValues,
  accountOptions,
  categoryOptions,
  onCreateCategory,
  accounts = []
}: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const watchedAccountId = form.watch('accountId');
  const accountCurrency = accounts.find(a => a.id === watchedAccountId)?.currency ?? DEFAULT_CURRENCY;

  const handleSubmit = (values: FormValues) => {
    const amountInMiliUnits = convertAmountToMiliUnits(parseFloat(values.amount));
    onSubmit({ ...values, amount: amountInMiliUnits, date: new Date(values.date) });
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
                <ResponsiveSelect
                  value={field.value}
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
          name='categoryId'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <ResponsiveSelect
                  value={field.value ?? ''}
                  options={categoryOptions}
                  placeholder='Select Category'
                  disabled={disabled}
                  allowCreatingOptions
                  onCreate={onCreateCategory}
                  onChangeAction={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='payee'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payee</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} disabled={disabled} placeholder='Add a payee' />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='amount'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder={'0.00'} currency={accountCurrency} />
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
        <Button className='w-full' disabled={disabled}>
          {id ? 'Save Changes' : 'Create Transaction'}
        </Button>
        {!!id && (
          <Button type='button' disabled={disabled} onClick={onDelete} className='w-full' variant='outline'>
            <Trash className='size-4 mr-2' />
            Delete Transaction
          </Button>
        )}
      </form>
    </Form>
  );
};
