'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useOpenEditSettlementSheet } from '../hooks/useOpenEditSettlementSheet';
import { useEditSettlement } from '../api/useEditSettlement';
import { SettlementForm } from './SettlementForm';

export function EditSettlementSheet() {
  const { isOpen, onClose, data } = useOpenEditSettlementSheet();
  const { mutate, isPending } = useEditSettlement(data?.id ?? '');

  if (!data) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='max-sm:w-full space-y-4 overflow-y-auto overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Edit settlement</SheetTitle>
          <SheetDescription>Update the settlement details.</SheetDescription>
        </SheetHeader>
        <SettlementForm
          submitLabel='Save changes'
          defaults={{
            contactId: data.contactId,
            contactName: data.contactName,
            direction: data.direction,
            groupId: data.groupId,
            groupName: data.groupName,
            groupMembers: data.groupMembers,
            initialAmount: data.amount,
            initialDate: data.date,
            initialNotes: data.notes,
            initialAccountId: data.initialAccountId
          }}
          disabled={isPending}
          onSubmit={values => {
            mutate(values, { onSuccess: onClose });
          }}
        />
      <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
      </SheetContent>
    </Sheet>
  );
}
