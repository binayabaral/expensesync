import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { insertRecurringPaymentSchema } from '@/db/schema';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { useCreateRecurringPayment } from '@/features/recurring-payments/api/useCreateRecurringPayment';
import { useAddRecurringPayment } from '@/features/recurring-payments/hooks/useAddRecurringPayment';
import {
  RecurringPaymentForm,
  type RecurringPaymentFormValues,
  type RecurringPaymentApiValues
} from '@/features/recurring-payments/components/RecurringPaymentForm';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertRecurringPaymentSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  lastCompletedAt: true
});

type FormValues = z.input<typeof formSchema>;

export const AddRecurringPaymentSheet = () => {
  const { isOpen, onClose } = useAddRecurringPayment();
  const createRecurringPayment = useCreateRecurringPayment();

  const accountsQuery = useGetAccounts();
  const accountOptions = (accountsQuery.data ?? []).map(account => ({
    label: account.name,
    value: account.id
  }));

  const categoriesQuery = useGetCategories();
  const categoryOptions = (categoriesQuery.data ?? []).map(category => ({
    label: category.name,
    value: category.id
  }));

  const isLoading = accountsQuery.isLoading || categoriesQuery.isLoading;
  const isPending = createRecurringPayment.isPending;

  const onSubmit = (values: RecurringPaymentApiValues) => {
    createRecurringPayment.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const now = new Date();
  const defaultValues: RecurringPaymentFormValues = {
    name: '',
    type: 'TRANSACTION',
    cadence: 'MONTHLY',
    amount: '',
    transferCharge: '0',
    accountId: '',
    categoryId: '',
    toAccountId: '',
    notes: '',
    startDate: now,
    dayOfMonth: now.getDate(),
    month: now.getMonth() + 1,
    isActive: true
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>New Recurring Payment</SheetTitle>
          <SheetDescription>Create a new recurring payment.</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2 className='size-4 text-muted-foreground animate-spin' />
          </div>
        ) : (
          <RecurringPaymentForm
            onSubmit={onSubmit}
            disabled={isPending}
            defaultValues={defaultValues}
            accountOptions={accountOptions}
            categoryOptions={categoryOptions}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
