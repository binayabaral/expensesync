'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useOpenAddContactSheet } from '../hooks/useOpenAddContactSheet';
import { useCreateContact } from '../api/useCreateContact';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal(''))
});

type FormValues = z.infer<typeof formSchema>;

export function AddContactSheet() {
  const { isOpen, onClose } = useOpenAddContactSheet();
  const { mutate, isPending } = useCreateContact();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '' }
  });

  function handleSubmit(values: FormValues) {
    mutate(
      { name: values.name, email: values.email || undefined },
      {
        onSuccess: () => {
          form.reset();
          onClose();
        }
      }
    );
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      form.reset();
      onClose();
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>Add contact</SheetTitle>
          <SheetDescription>
            Add someone to split expenses with. If they join ExpenseSync with the same email, they&apos;ll see the splits too.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Rajan' disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='rajan@example.com'
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Used to link this contact when they enroll in Bill Split.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' disabled={isPending} className='w-full'>
              Add contact
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
