import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const editAccountSchema = z.object({
  name: z.string(),
  isHidden: z.boolean()
});

type FormValues = z.input<typeof editAccountSchema>;

type Props = {
  id?: string;
  disabled?: boolean;
  onDelete?: () => void;
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => void;
};

export const EditAccountForm = ({ id, onSubmit, onDelete, disabled, defaultValues }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: defaultValues
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
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
