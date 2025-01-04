import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { insertTransferSchema } from '@/db/schema';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { TransferForm } from '@/features/transfers/components/TransferForm';
import { useCreateTransfer } from '@/features/transfers/api/useCreateTransfer';
import { useOpenAddTransferSheet } from '@/features/transfers/hooks/useOpenAddTransferSheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertTransferSchema.omit({
  id: true,
  userId: true
});

type FormValues = z.input<typeof formSchema>;

export const AddTransferSheet = () => {
  const { isOpen, onClose } = useOpenAddTransferSheet();
  const createTransferMutation = useCreateTransfer();

  const accountsQuery = useGetAccounts();
  const accountOptions = (accountsQuery.data ?? []).map(account => ({
    label: account.name,
    value: account.id
  }));

  const onSubmit = (values: FormValues) => {
    createTransferMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const isPending = createTransferMutation.isPending;
  const isLoading = accountsQuery.isLoading;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>New Transfer</SheetTitle>
          <SheetDescription>Create a new transfer.</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2 className='size-4 text-muted-foreground animate-spin' />
          </div>
        ) : (
          <TransferForm onSubmit={onSubmit} disabled={isPending} accountOptions={accountOptions} />
        )}
      </SheetContent>
    </Sheet>
  );
};
