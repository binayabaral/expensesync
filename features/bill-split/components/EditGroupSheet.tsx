'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOpenEditGroupSheet } from '../hooks/useOpenEditGroupSheet';
import { useGetGroup } from '../api/useGetGroup';
import { useEditGroup } from '../api/useEditGroup';
import { GroupForm } from './GroupForm';

export function EditGroupSheet() {
  const { isOpen, onClose, id } = useOpenEditGroupSheet();
  const groupQuery = useGetGroup(id ?? '');
  const { mutate, isPending } = useEditGroup(id ?? '');

  const group = groupQuery.data;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='max-sm:w-full space-y-4 overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Edit group</SheetTitle>
          <SheetDescription>Update group details. Currency cannot be changed after creation.</SheetDescription>
        </SheetHeader>
        {groupQuery.isLoading || !group ? (
          <div className='space-y-3'>
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-20 w-full' />
            <Skeleton className='h-9 w-full' />
          </div>
        ) : (
          <GroupForm
            disabled={isPending}
            submitLabel='Save changes'
            disableCurrency
            defaultValues={{
              name: group.name,
              description: group.description ?? '',
              currency: group.currency as never,
              simplifyDebts: group.simplifyDebts
            }}
            onSubmit={values => {
              mutate(
                { name: values.name, description: values.description ?? null, simplifyDebts: values.simplifyDebts },
                { onSuccess: onClose }
              );
            }}
          />
        )}
      <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
      </SheetContent>
    </Sheet>
  );
}
