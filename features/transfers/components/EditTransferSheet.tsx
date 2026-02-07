import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { useConfirm } from '@/hooks/useConfirm';
import { insertTransferSchema } from '@/db/schema';
import { convertAmountFromMiliUnits } from '@/lib/utils';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetTransfer } from '@/features/transfers/api/useGetTransfer';
import { useEditTransfer } from '@/features/transfers/api/useEditTransfer';
import { TransferForm } from '@/features/transfers/components/TransferForm';
import { useDeleteTransfer } from '@/features/transfers/api/useDeleteTransfer';
import { useOpenEditTransferSheet } from '@/features/transfers/hooks/useOpenEditTransferSheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertTransferSchema.omit({
  id: true,
  userId: true
});

type FormValues = z.input<typeof formSchema>;

export const EditTransferSheet = () => {
  const { isOpen, onClose, id } = useOpenEditTransferSheet();
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this transfer.');

  const editMutation = useEditTransfer(id);
  const transferQuery = useGetTransfer(id);
  const deleteMutation = useDeleteTransfer(id);

  const accountsQuery = useGetAccounts();
  const accounts = accountsQuery.data ?? [];
  const accountOptions = accounts.map(account => ({
    label: account.name,
    value: account.id
  }));

  const isLoading = transferQuery.isLoading;
  const isPending =
    editMutation.isPending || accountsQuery.isLoading || deleteMutation.isPending || transferQuery.isLoading;

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

  const defaultValues = transferQuery.data
    ? {
        ...transferQuery.data,
        date: new Date(transferQuery.data.date),
        amount: convertAmountFromMiliUnits(transferQuery.data.amount).toString(),
        transferCharge: convertAmountFromMiliUnits(transferQuery.data.transferCharge).toString(),
        creditCardStatementId: transferQuery.data.creditCardStatementId ?? ''
      }
    : {
        notes: '',
        amount: '',
        accountId: '',
        toAccountId: '',
        date: new Date(),
        fromAccountId: '',
        transferCharge: '',
        creditCardStatementId: ''
      };

  return (
    <>
      <ConfirmDialog />
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className='space-y-4'>
          <SheetHeader>
            <SheetTitle>Edit Transfer</SheetTitle>
            <SheetDescription>Edit an existing transfer.</SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className='flex justify-center'>
              <Loader2 className='size-12 text-muted-foreground animate-spin' />
            </div>
          ) : (
            <TransferForm
              id={id}
              onDelete={onDelete}
              onSubmit={onSubmit}
              disabled={isPending}
              defaultValues={defaultValues}
              accountOptions={accountOptions}
              accounts={accounts}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
