'use client';

import { Edit, MoreHorizontal, Trash, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';
import { convertAmountFromMiliUnits } from '@/lib/utils';
import { useAddTransaction } from '@/features/transactions/hooks/useAddTransaction';
import { useOpenAddTransferSheet } from '@/features/transfers/hooks/useOpenAddTransferSheet';
import { useDeleteRecurringPayment } from '@/features/recurring-payments/api/useDeleteRecurringPayment';
import { useOpenEditRecurringPaymentSheet } from '@/features/recurring-payments/hooks/useOpenEditRecurringPaymentSheet';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import type { ResponseType } from './columns';

type Props = {
  item: ResponseType;
};

export const Actions = ({ item }: Props) => {
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this recurring payment.');
  const deleteMutation = useDeleteRecurringPayment(item.id);
  const { onOpen } = useOpenEditRecurringPaymentSheet();
  const addTransaction = useAddTransaction();
  const addTransfer = useOpenAddTransferSheet();

  const handleDelete = async () => {
    const ok = await confirm();

    if (ok) {
      deleteMutation.mutate();
    }
  };

  const handleComplete = () => {
    const amount = convertAmountFromMiliUnits(item.amount).toString();
    const dueDate = item.nextDueDate ? new Date(item.nextDueDate) : new Date();

    if (item.type === 'TRANSFER') {
      addTransfer.onOpen({
        recurringPaymentId: item.id,
        defaultValues: {
          fromAccountId: item.accountId || '',
          toAccountId: item.toAccountId || '',
          amount,
          transferCharge: '0',
          notes: item.notes || '',
          date: dueDate
        }
      });

      return;
    }

    addTransaction.onOpen({
      recurringPaymentId: item.id,
      defaultValues: {
        accountId: item.accountId || '',
        categoryId: item.categoryId || '',
        payee: item.name,
        amount,
        notes: item.notes || '',
        date: dueDate
      }
    });
  };

  return (
    <>
      <ConfirmDialog />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='size-8 p-0'>
            <MoreHorizontal className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={handleComplete}>
            <CheckCircle2 className='size-4 mr-2' /> Complete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpen(item.id)}>
            <Edit className='size-4 mr-2' /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash className='size-4 mr-2' /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
