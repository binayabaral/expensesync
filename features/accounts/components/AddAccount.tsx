import { z } from 'zod';

import { AccountForm } from '@/features/accounts/components/AccountForm';
import { useAddAccount } from '@/features/accounts/hooks/useAddAccounts';
import { useCreateAccount } from '@/features/accounts/api/useCreateAccounts';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formSchema = z.object({
  name: z.string(),
  isHidden: z.boolean(),
  startingBalance: z.number(),
  accountType: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER']),
  creditLimit: z.number().nullable().optional(),
  apr: z.number().nullable().optional(),
  statementCloseDay: z.number().nullable().optional(),
  statementCloseIsEom: z.boolean().optional(),
  paymentDueDay: z.number().nullable().optional(),
  paymentDueDays: z.number().nullable().optional(),
  minimumPaymentPercentage: z.number().optional()
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
        <AccountForm
          onSubmit={onSubmit}
          disabled={mutation.isPending}
          defaultValues={{
            name: '',
            isHidden: false,
            startingBalance: '0',
            accountType: 'CASH',
            creditLimit: '',
            apr: '',
            statementCloseMode: 'DAY',
            statementCloseDay: '',
            paymentDueMode: 'DAY',
            paymentDueDay: '',
            paymentDueDays: '',
            minimumPaymentPercentage: '2'
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
