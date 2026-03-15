'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SUPPORTED_CURRENCIES } from '@/db/schema';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  simplifyDebts: z.boolean()
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
  disabled?: boolean;
  submitLabel?: string;
  disableCurrency?: boolean;
};

export function GroupForm({ defaultValues, onSubmit, disabled, submitLabel = 'Create group', disableCurrency }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'NPR',
      simplifyDebts: true,
      ...defaultValues
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group name</FormLabel>
              <FormControl>
                <Input placeholder='e.g. Pokhara Trip' disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder='What is this group for?' disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='currency'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <ResponsiveSelect
                  value={field.value}
                  options={SUPPORTED_CURRENCIES.map(c => ({ label: c, value: c }))}
                  placeholder='Select currency'
                  disabled={disabled || disableCurrency}
                  onChangeAction={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={disabled} className='w-full'>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
