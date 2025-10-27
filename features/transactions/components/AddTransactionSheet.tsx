import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { startOfMinute } from 'date-fns';
import { useSearchParams } from 'next/navigation';

import { insertTransactionSchema } from '@/db/schema';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { useCreateCategory } from '@/features/categories/api/useCreateCategory';
import { useAddTransaction } from '@/features/transactions/hooks/useAddTransaction';
import { TransactionForm } from '@/features/transactions/components/TransactionForm';
import { useCreateTransaction } from '@/features/transactions/api/useCreateTransaction';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertTransactionSchema.omit({
  id: true
});

type FormValues = z.input<typeof formSchema>;

export const AddTransactionSheet = () => {
  const params = useSearchParams();
  const { isOpen, onClose } = useAddTransaction();
  const createTransactionMutation = useCreateTransaction();

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

  const onSubmit = (values: FormValues) => {
    createTransactionMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const accountId = params.get('accountId') || '';

  const isPending = createTransactionMutation.isPending || categoryMutation.isPending;
  const isLoading = categoryQuery.isLoading || accountsQuery.isLoading;

  const defaultValues = {
    accountId,
    payee: '',
    notes: '',
    amount: '',
    categoryId: '',
    date: startOfMinute(new Date())
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>New Transaction</SheetTitle>
          <SheetDescription>Create a new transaction.</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2 className='size-4 text-muted-foreground animate-spin' />
          </div>
        ) : (
          <TransactionForm
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
  );
};
