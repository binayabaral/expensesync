'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useOpenAddExpenseSheet } from '../hooks/useOpenAddExpenseSheet';
import { useCreateExpense } from '../api/useCreateExpense';
import { useRecordShare } from '../api/useRecordShare';
import { useGetGroup } from '../api/useGetGroup';
import { ExpenseForm } from './ExpenseForm';

export function AddExpenseSheet() {
  const { isOpen, onClose, groupId } = useOpenAddExpenseSheet();
  const { mutate, isPending } = useCreateExpense();
  const { mutate: recordShare, isPending: isRecording } = useRecordShare();
  const groupQuery = useGetGroup(groupId ?? '');

  const groupMembers = groupId && groupQuery.data
    ? groupQuery.data.members
        .filter(m => !m.isCurrentUser) // exclude current user (shown as "You" in the form)
        .map(m => ({ contactId: m.contactId, contactName: m.displayName ?? m.contactName }))
    : undefined;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='max-sm:w-full space-y-4 overflow-y-auto overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Add expense</SheetTitle>
          <SheetDescription>Split a bill with participants.</SheetDescription>
        </SheetHeader>
        <ExpenseForm
          groupId={groupId}
          groupMembers={groupMembers}
          disabled={isPending || isRecording}
          onSubmit={values => {
            mutate(
              { ...values, groupId: groupId ?? null },
              {
                onSuccess: (data) => {
                  if (values.recordTransaction && data.userShareId) {
                    recordShare(
                      {
                        expenseId: data.id,
                        shareId: data.userShareId,
                        categoryId: values.categoryId ?? null,
                        date: values.date,
                        actualAccountId: values.paidByUser && values.accountId ? values.accountId : undefined,
                        notes: values.notes ?? null
                      },
                      { onSuccess: onClose }
                    );
                  } else {
                    onClose();
                  }
                }
              }
            );
          }}
        />
      <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
      </SheetContent>
    </Sheet>
  );
}
