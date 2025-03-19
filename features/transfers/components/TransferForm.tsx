import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Select } from '@/components/Select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { insertTransferSchema } from '@/db/schema';
import { convertAmountToMiliUnits } from '@/lib/utils';
import { AmountInput } from '@/components/AmountInput';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const formSchema = z.object({
  amount: z.string(),
  date: z.coerce.date(),
  transferCharge: z.string(),
  notes: z.string().nullable().optional(),
  toAccountId: z.string().nullable().optional(),
  fromAccountId: z.string().nullable().optional()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const apiSchema = insertTransferSchema.omit({
  id: true,
  userId: true
});

type FormValues = z.input<typeof formSchema>;
type ApiFormValues = z.input<typeof apiSchema>;

type Props = {
  id?: string;
  disabled: boolean;
  onDelete?: () => void;
  defaultValues?: FormValues;
  onSubmit: (values: ApiFormValues) => void;
  accountOptions: { label: string; value: string }[];
};

export const TransferForm = ({ id, onSubmit, onDelete, disabled, defaultValues, accountOptions }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const handleSubmit = (values: FormValues) => {
    const amountInMiliUnits = convertAmountToMiliUnits(parseFloat(values.amount));
    const transferChargeInMiliUnits = convertAmountToMiliUnits(parseFloat(values.transferCharge));
    onSubmit({
      ...values,
      amount: amountInMiliUnits,
      date: new Date(values.date),
      transferCharge: transferChargeInMiliUnits
    });
  };

  const handleDelete = () => {
    onDelete?.();
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
                <Select
                  value={field.value}
                  disabled={disabled}
                  options={accountOptions}
                  allowCreatingOptions={false}
                  placeholder='Select Account'
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
                <Select
                  value={field.value}
                  disabled={disabled}
                  options={accountOptions}
                  allowCreatingOptions={false}
                  placeholder='Select Account'
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
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder={'0.00'} allowNegativeValue={false} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='transferCharge'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extra Charges (Transfer fees / Interest Amount)</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder={'0.00'} />
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
          {id ? 'Save Changes' : 'Create Transfer'}
        </Button>
        {!!id && (
          <Button type='button' disabled={disabled} onClick={handleDelete} className='w-full' variant='outline'>
            <Trash className='size-4 mr-2' />
            Delete Transfer
          </Button>
        )}
      </form>
    </Form>
  );
};
