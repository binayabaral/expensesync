import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { useConfirm } from '@/hooks/useConfirm';
import { insertTransactionSchema } from '@/db/schema';
import { convertAmountFromMiliUnits } from '@/lib/utils';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { useCreateCategory } from '@/features/categories/api/useCreateCategory';
import { useGetTransaction } from '@/features/transactions/api/useGetTransaction';
import { useEditTransaction } from '@/features/transactions/api/useEditTransaction';
import { TransactionForm } from '@/features/transactions/components/TransactionForm';
import { useDeleteTransaction } from '@/features/transactions/api/useDeleteTransaction';
import { useOpenEditTransactionSheet } from '@/features/transactions/hooks/useOpenEditTransactionSheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertTransactionSchema.omit({
  id: true
});

type FormValues = z.input<typeof formSchema>;

export const EditTransactionSheet = () => {
  const { isOpen, onClose, id } = useOpenEditTransactionSheet();
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this transaction.');

  const editMutation = useEditTransaction(id);
  const transactionQuery = useGetTransaction(id);
  const deleteMutation = useDeleteTransaction(id);

  const categoryQuery = useGetCategories();
  const categoryMutation = useCreateCategory();
  const onCreateCategory = (name: string) => categoryMutation.mutate({ name });
  const categoryOptions = (categoryQuery.data ?? []).map(category => ({
    label: category.name,
    value: category.id
  }));

  const accountsQuery = useGetAccounts();
  const accountOptions = (accountsQuery.data ?? []).map(account => ({
    label: account.name,
    value: account.id
  }));

  const isLoading = transactionQuery.isLoading;
  const isPending =
    editMutation.isPending ||
    accountsQuery.isLoading ||
    deleteMutation.isPending ||
    transactionQuery.isLoading ||
    categoryMutation.isPending;

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

  const defaultValues = transactionQuery.data
    ? {
        ...transactionQuery.data,
        date: new Date(transactionQuery.data.date),
        amount: convertAmountFromMiliUnits(transactionQuery.data.amount).toString()
      }
    : {
        payee: '',
        notes: '',
        amount: '',
        accountId: '',
        categoryId: '',
        date: new Date()
      };

  return (
    <>
      <ConfirmDialog />
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className='space-y-4'>
          <SheetHeader>
            <SheetTitle>Edit Transaction</SheetTitle>
            <SheetDescription>Edit an existing transaction.</SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className='flex justify-center'>
              <Loader2 className='size-12 text-muted-foreground animate-spin' />
            </div>
          ) : (
            <TransactionForm
              id={id}
              onDelete={onDelete}
              onSubmit={onSubmit}
              disabled={isPending}
              defaultValues={defaultValues}
              accountOptions={accountOptions}
              categoryOptions={categoryOptions}
              onCreateCategory={onCreateCategory}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
