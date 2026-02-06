import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { useConfirm } from '@/hooks/useConfirm';
import { insertRecurringPaymentSchema } from '@/db/schema';
import { convertAmountFromMiliUnits } from '@/lib/utils';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { useGetRecurringPayment } from '@/features/recurring-payments/api/useGetRecurringPayment';
import { useEditRecurringPayment } from '@/features/recurring-payments/api/useEditRecurringPayment';
import { useDeleteRecurringPayment } from '@/features/recurring-payments/api/useDeleteRecurringPayment';
import { useOpenEditRecurringPaymentSheet } from '@/features/recurring-payments/hooks/useOpenEditRecurringPaymentSheet';
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

export const EditRecurringPaymentSheet = () => {
  const { isOpen, onClose, id } = useOpenEditRecurringPaymentSheet();
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this recurring payment.');

  const recurringQuery = useGetRecurringPayment(id);
  const editMutation = useEditRecurringPayment(id);
  const deleteMutation = useDeleteRecurringPayment(id);

  const accountsQuery = useGetAccounts();
  const categoriesQuery = useGetCategories();

  const accountOptions = (accountsQuery.data ?? []).map(account => ({
    label: account.name,
    value: account.id
  }));

  const categoryOptions = (categoriesQuery.data ?? []).map(category => ({
    label: category.name,
    value: category.id
  }));

  const isLoading = recurringQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading;
  const isPending = editMutation.isPending || deleteMutation.isPending;

  const onSubmit = (values: RecurringPaymentApiValues) => {
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

  const defaultValues: RecurringPaymentFormValues = recurringQuery.data
    ? {
        ...recurringQuery.data,
        startDate: new Date(recurringQuery.data.startDate),
        amount: convertAmountFromMiliUnits(recurringQuery.data.amount).toString(),
        transferCharge: convertAmountFromMiliUnits(recurringQuery.data.transferCharge || 0).toString()
      }
    : {
        name: '',
        type: 'TRANSACTION',
        cadence: 'MONTHLY',
        amount: '',
        transferCharge: '0',
        accountId: '',
        categoryId: '',
        toAccountId: '',
        notes: '',
        startDate: new Date(),
        dayOfMonth: null,
        month: null,
        isActive: true
      };

  return (
    <>
      <ConfirmDialog />
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className='space-y-4' tabIndex={undefined}>
          <SheetHeader>
            <SheetTitle>Edit Recurring Payment</SheetTitle>
            <SheetDescription>Edit an existing recurring payment.</SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className='flex justify-center'>
              <Loader2 className='size-12 text-muted-foreground animate-spin' />
            </div>
          ) : (
            <RecurringPaymentForm
              id={id}
              onDelete={onDelete}
              onSubmit={onSubmit}
              disabled={isPending}
              defaultValues={defaultValues}
              accountOptions={accountOptions}
              categoryOptions={categoryOptions}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
