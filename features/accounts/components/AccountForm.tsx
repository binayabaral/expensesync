import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AmountInput } from '@/components/AmountInput';
import { convertAmountToMiliUnits } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string(),
  isHidden: z.boolean(),
  startingBalance: z.string()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const apiSchema = z.object({
  name: z.string(),
  isHidden: z.boolean(),
  startingBalance: z.number()
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const editSchema = z.object({
  name: z.string(),
  isHidden: z.boolean()
});

type FormValues = z.input<typeof formSchema>;
type ApiFormValues = z.input<typeof apiSchema>;
type EditFormValues = z.input<typeof editSchema>;

type Props = {
  id?: string;
  disabled?: boolean;
  onDelete?: () => void;
  defaultValues?: EditFormValues;
  onSubmit: (values: ApiFormValues) => void;
};

export const AccountForm = ({ id, onSubmit, onDelete, disabled, defaultValues }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const handleSubmit = (values: FormValues) => {
    const amountInMiliUnits = convertAmountToMiliUnits(parseFloat(values.startingBalance));
    onSubmit({ ...values, startingBalance: amountInMiliUnits });
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
