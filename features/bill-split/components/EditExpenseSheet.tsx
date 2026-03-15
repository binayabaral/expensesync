'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOpenEditExpenseSheet } from '../hooks/useOpenEditExpenseSheet';
import { useEditExpense } from '../api/useEditExpense';
import { useGetGroup } from '../api/useGetGroup';
import { ExpenseForm } from './ExpenseForm';
export function EditExpenseSheet() {
  const { isOpen, onClose, expenseId, groupId, initialValues } = useOpenEditExpenseSheet();
  const { mutate, isPending } = useEditExpense(expenseId ?? '');
  const groupQuery = useGetGroup(groupId ?? '');

  const groupMembers = groupId && groupQuery.data
    ? groupQuery.data.members
        .filter(m => !m.isCurrentUser)
        .map(m => ({ contactId: m.contactId, contactName: m.displayName ?? m.contactName }))
    : undefined;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4 overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Edit expense</SheetTitle>
          <SheetDescription>Update the expense details.</SheetDescription>
        </SheetHeader>
        {initialValues && (
          <ExpenseForm
            groupId={groupId}
            groupMembers={groupMembers}
            disabled={isPending}
            initialValues={initialValues}
            submitLabel='Save changes'
            onSubmit={values => {
              mutate(
                {
                  description: values.description,
                  date: values.date,
                  notes: values.notes,
                  categoryId: values.categoryId,
                  totalAmount: values.totalAmount,
                  paidByUser: values.paidByUser,
                  paidByContactId: values.paidByContactId,
                  splitType: values.splitType,
                  shares: values.shares
                },
                { onSuccess: onClose }
              );
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
