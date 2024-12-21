import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { useConfirm } from '@/hooks/useConfirm';
import { insertAccountSchema } from '@/db/schema';
import { useGetAccount } from '@/features/accounts/api/useGetAccount';
import { useEditAccount } from '@/features/accounts/api/useEditAccounts';
import { AccountForm } from '@/features/accounts/components/AccountForm';
import { useDeleteAccount } from '@/features/accounts/api/useDeleteAccounts';
import { useOpenEditAccountSheet } from '@/features/accounts/hooks/useOpenEditAccountSheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertAccountSchema.pick({
  name: true
});

type FormValues = z.input<typeof formSchema>;

export const EditAccountSheet = () => {
  const { isOpen, onClose, id } = useOpenEditAccountSheet();
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this account.');

  const editMutation = useEditAccount(id);
  const deleteMutation = useDeleteAccount(id);
  const accountQuery = useGetAccount(id);

  const isLoading = accountQuery.isLoading;
  const isPending = editMutation.isPending || deleteMutation.isPending;

  const onSubmit = (values: FormValues) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const onDelete = async () => {
    const ok = await confirm();

    if (ok) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  const defaultValues = accountQuery.data ? { name: accountQuery.data.name } : { name: '' };

  return (
    <>
      <ConfirmDialog />
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className='space-y-4'>
          <SheetHeader>
            <SheetTitle>Edit Account</SheetTitle>
            <SheetDescription>Edit an existing account.</SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className='flex justify-center'>
              <Loader2 className='size-12 text-muted-foreground animate-spin' />
            </div>
          ) : (
            <AccountForm
              id={id}
              onDelete={onDelete}
              onSubmit={onSubmit}
              disabled={isPending}
              defaultValues={defaultValues}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
