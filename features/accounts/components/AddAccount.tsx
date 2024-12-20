import { z } from 'zod';

import { insertAccountSchema } from '@/db/schema';
import { AccountForm } from '@/features/accounts/components/AccountForm';
import { useAddAccount } from '@/features/accounts/hooks/useAddAccounts';
import { useCreateAccount } from '@/features/accounts/api/useCreateAccounts';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertAccountSchema.pick({
  name: true
});

type FormValues = z.input<typeof formSchema>;

export const AddAccount = () => {
  const { isOpen, onClose } = useAddAccount();
  const mutation = useCreateAccount();

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>New Account</SheetTitle>
          <SheetDescription>Create a new account to track your transactions.</SheetDescription>
        </SheetHeader>
        <AccountForm onSubmit={onSubmit} disabled={mutation.isPending} defaultValues={{ name: '' }} />
      </SheetContent>
    </Sheet>
  );
};
