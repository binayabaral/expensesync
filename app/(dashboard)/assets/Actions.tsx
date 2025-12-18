'use client';

import { ListOrdered, MoreHorizontal, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useOpenAssetLotsSheet } from '@/features/assets/hooks/useOpenAssetLotsSheet';
import { useOpenSellAssetSheet } from '@/features/assets/hooks/useOpenSellAssetSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type Props = {
  id: string;
};

export const Actions = ({ id }: Props) => {
  const lotsSheet = useOpenAssetLotsSheet();
  const sellSheet = useOpenSellAssetSheet();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='size-8 p-0'>
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => lotsSheet.onOpen(id)}>
          <ListOrdered className='size-4 mr-2' /> View Transactions
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sellSheet.onOpen(id)}>
          <Wallet className='size-4 mr-2' /> Sell
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

