'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOpenAddGroupSheet } from '../hooks/useOpenAddGroupSheet';
import { useCreateGroup } from '../api/useCreateGroup';
import { GroupForm } from './GroupForm';

export function AddGroupSheet() {
  const { isOpen, onClose } = useOpenAddGroupSheet();
  const { mutate, isPending } = useCreateGroup();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>New group</SheetTitle>
          <SheetDescription>Create a group to split expenses with friends.</SheetDescription>
        </SheetHeader>
        <GroupForm
          disabled={isPending}
          onSubmit={values => {
            mutate(values, { onSuccess: onClose });
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
