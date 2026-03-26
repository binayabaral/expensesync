'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useOpenAddSettlementSheet } from '../hooks/useOpenAddSettlementSheet';
import { useCreateSettlement } from '../api/useCreateSettlement';
import { SettlementForm } from './SettlementForm';

export function AddSettlementSheet() {
  const { isOpen, onClose, defaults } = useOpenAddSettlementSheet();
  const { mutate, isPending } = useCreateSettlement();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='max-sm:w-full space-y-4 overflow-y-auto overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Record settlement</SheetTitle>
          <SheetDescription>Record a repayment between you and a contact.</SheetDescription>
        </SheetHeader>
        <SettlementForm
          defaults={defaults}
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
