import { Loader2 } from 'lucide-react';

import { useConfirm } from '@/hooks/useConfirm';
import { convertAmountFromMiliUnits } from '@/lib/utils';
import { useGetAccount } from '@/features/accounts/api/useGetAccount';
import { useEditAccount } from '@/features/accounts/api/useEditAccounts';
import { useDeleteAccount } from '@/features/accounts/api/useDeleteAccounts';
import { EditAccountForm } from '@/features/accounts/components/EditAccountForm';
import { useOpenEditAccountSheet } from '@/features/accounts/hooks/useOpenEditAccountSheet';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type DefaultValues = {
  name: string;
  isHidden: boolean;
  accountType: 'CASH' | 'BANK' | 'CREDIT_CARD' | 'LOAN' | 'OTHER';
  creditLimit?: string | null;
  apr?: string | null;
  statementCloseMode: 'DAY' | 'EOM';
  statementCloseDay?: string | null;
  paymentDueMode: 'DAY' | 'DAYS';
  paymentDueDay?: string | null;
  paymentDueDays?: string | null;
  minimumPaymentPercentage?: string | null;
};

type SubmitValues = {
  name: string;
  isHidden: boolean;
  accountType: 'CASH' | 'BANK' | 'CREDIT_CARD' | 'LOAN' | 'OTHER';
  creditLimit?: number | null;
  apr?: number | null;
  statementCloseDay?: number | null;
  statementCloseIsEom?: boolean;
  paymentDueDay?: number | null;
  paymentDueDays?: number | null;
  minimumPaymentPercentage?: number;
};

export const EditAccountSheet = () => {
  const { isOpen, onClose, id } = useOpenEditAccountSheet();
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this account.');

  const editMutation = useEditAccount(id);
  const deleteMutation = useDeleteAccount(id);
  const accountQuery = useGetAccount(id);

  const isLoading = accountQuery.isLoading;
  const isPending = editMutation.isPending || deleteMutation.isPending;

  const onSubmit = (values: SubmitValues) => {
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

  const defaultValues: DefaultValues = accountQuery.data
    ? {
        name: accountQuery.data.name,
        isHidden: accountQuery.data.isHidden,
        accountType: (accountQuery.data.accountType ?? 'CASH') as DefaultValues['accountType'],
        creditLimit: accountQuery.data.creditLimit
          ? convertAmountFromMiliUnits(accountQuery.data.creditLimit).toString()
          : '',
        apr: accountQuery.data.apr ? accountQuery.data.apr.toString() : '',
        statementCloseMode: (accountQuery.data.statementCloseIsEom ? 'EOM' : 'DAY') as DefaultValues['statementCloseMode'],
        statementCloseDay: accountQuery.data.statementCloseDay ? accountQuery.data.statementCloseDay.toString() : '',
        paymentDueMode: (accountQuery.data.paymentDueDays ? 'DAYS' : 'DAY') as DefaultValues['paymentDueMode'],
        paymentDueDay: accountQuery.data.paymentDueDay ? accountQuery.data.paymentDueDay.toString() : '',
        paymentDueDays: accountQuery.data.paymentDueDays ? accountQuery.data.paymentDueDays.toString() : '',
        minimumPaymentPercentage: accountQuery.data.minimumPaymentPercentage
          ? accountQuery.data.minimumPaymentPercentage.toString()
          : '2'
      }
    : {
        name: '',
        isHidden: false,
        accountType: 'CASH',
        creditLimit: '',
        apr: '',
        statementCloseMode: 'DAY',
        statementCloseDay: '',
        paymentDueMode: 'DAY',
        paymentDueDay: '',
        paymentDueDays: '',
        minimumPaymentPercentage: '2'
      };

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
            <EditAccountForm
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
