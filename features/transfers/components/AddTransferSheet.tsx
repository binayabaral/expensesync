import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { insertTransferSchema } from '@/db/schema';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { TransferForm } from '@/features/transfers/components/TransferForm';
import { useCreateTransfer } from '@/features/transfers/api/useCreateTransfer';
import { useOpenAddTransferSheet } from '@/features/transfers/hooks/useOpenAddTransferSheet';
import { useCompleteRecurringPayment } from '@/features/recurring-payments/api/useCompleteRecurringPayment';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = insertTransferSchema.omit({
  id: true,
  userId: true
});

type FormValues = z.infer<typeof formSchema>;

export const AddTransferSheet = () => {
  const { isOpen, onClose, defaultValues: initialValues, recurringPaymentId } = useOpenAddTransferSheet();
  const createTransferMutation = useCreateTransfer();
  const completeRecurringPayment = useCompleteRecurringPayment(recurringPaymentId);

  const accountsQuery = useGetAccounts();
  const accounts = accountsQuery.data ?? [];
  const accountOptions = accounts.filter(account => !account.isClosed).map(account => ({
    label: account.name,
    value: account.id
  }));

  const onSubmit = (values: FormValues) => {
    createTransferMutation.mutate(values, {
      onSuccess: async () => {
        if (recurringPaymentId) {
          await completeRecurringPayment.mutateAsync({ completedAt: values.date });
        }
        onClose();
      }
    });
  };

  const isPending = createTransferMutation.isPending;
  const isLoading = accountsQuery.isLoading;

  const defaultValues = {
    amount: '',
    transferCharge: '0',
    notes: '',
    toAccountId: '',
    fromAccountId: '',
    date: new Date(),
    creditCardStatementId: '',
    exchangeRate: '',
    ...initialValues
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='max-sm:w-full space-y-4 overflow-y-auto' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>New Transfer</SheetTitle>
          <SheetDescription>Create a new transfer.</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2 className='size-4 text-muted-foreground animate-spin' />
          </div>
        ) : (
          <TransferForm
            onSubmit={onSubmit}
            disabled={isPending}
            accountOptions={accountOptions}
            accounts={accounts}
            defaultValues={defaultValues}
          />
        )}
      <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
      </SheetContent>
    </Sheet>
  );
};
