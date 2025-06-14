import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { insertCategorySchema } from '@/db/schema';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const formSchema = insertCategorySchema.pick({
  name: true
});

type FormValues = z.input<typeof formSchema>;

type Props = {
  id?: string;
  disabled?: boolean;
  onDelete?: () => void;
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => void;
};

export const CategoryForm = ({ id, onSubmit, onDelete, disabled, defaultValues }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
                <Input disabled={disabled} placeholder='e.g. Food, Travel, etc.' {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button className='w-full' disabled={disabled}>
          {id ? 'Save Changes' : 'Create Category'}
        </Button>
        {!!id && (
          <Button type='button' disabled={disabled} onClick={handleDelete} className='w-full' variant='outline'>
            <Trash className='size-4 mr-2' />
            Delete Category
          </Button>
        )}
      </form>
    </Form>
  );
};
