import { JSX, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription
} from '@/components/ui/dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Defined outside the hook so React sees a stable component type across renders.
// Defining it inside would cause unmount/remount on every parent re-render.
function ConfirmationDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className='pt-2'>
          <Button onClick={onCancel} variant='outline'>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const useConfirm = (title: string, message: string): [() => JSX.Element, () => Promise<unknown>] => {
  const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = () =>
    new Promise(resolve => {
      setPromise({ resolve });
    });

  const handleClose = () => setPromise(null);

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmDialog = () => (
    <ConfirmationDialog
      open={promise !== null}
      title={title}
      message={message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return [ConfirmDialog, confirm];
};
