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
import { useCompleteRecurringPayment } from '@/features/recurring-payments/api/useCompleteRecurringPayment';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertTransactionSchema.omit({
  id: true
});

type FormValues = z.infer<typeof formSchema>;

export const AddTransactionSheet = () => {
  const params = useSearchParams();
  const { isOpen, onClose, defaultValues: initialValues, recurringPaymentId } = useAddTransaction();
  const createTransactionMutation = useCreateTransaction();
  const completeRecurringPayment = useCompleteRecurringPayment(recurringPaymentId);

  const categoryQuery = useGetCategories();
  const categoryMutation = useCreateCategory();
  const onCreateCategory = (name: string) => categoryMutation.mutate({ name });
  const categoryOptions = (categoryQuery.data ?? []).map(category => ({
    label: category.name,
    value: category.id
  }));

  const accountsQuery = useGetAccounts();
  const accounts = accountsQuery.data ?? [];
  const accountOptions = accounts.filter(account => !account.isClosed).map(account => ({
    label: account.name,
    value: account.id
  }));

  const onSubmit = (values: FormValues) => {
    createTransactionMutation.mutate(values, {
      onSuccess: async () => {
        if (recurringPaymentId) {
          await completeRecurringPayment.mutateAsync({ completedAt: values.date });
        }
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
    date: startOfMinute(new Date()),
    ...initialValues
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='max-sm:w-full space-y-4 overflow-y-auto' tabIndex={undefined}>
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
            accounts={accounts}
          />
        )}
      <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
      </SheetContent>
    </Sheet>
  );
};
