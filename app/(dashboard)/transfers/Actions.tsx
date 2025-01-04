'use client';

import { Edit, MoreHorizontal, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';
import { useDeleteTransfer } from '@/features/transfers/api/useDeleteTransfer';
import { useOpenEditTransferSheet } from '@/features/transfers/hooks/useOpenEditTransferSheet';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type Props = {
  id: string;
};

export const Actions = ({ id }: Props) => {
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'You are about to delete this transfer.');
  const deleteMutation = useDeleteTransfer(id);
  const { onOpen } = useOpenEditTransferSheet();

  const handleDelete = async () => {
    const ok = await confirm();

    if (ok) {
      deleteMutation.mutate();
    }
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
          <DropdownMenuItem onClick={() => onOpen(id)} disabled={deleteMutation.isPending}>
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
