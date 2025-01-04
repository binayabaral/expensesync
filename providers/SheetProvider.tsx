'use client';

import { useMountedState } from 'react-use';

import { AddAccount } from '@/features/accounts/components/AddAccount';
import { EditAccountSheet } from '@/features/accounts/components/EditAccountSheet';
import { AddTransferSheet } from '@/features/transfers/components/AddTransferSheet';
import { AddCategorySheet } from '@/features/categories/components/AddCategorySheet';
import { EditTransferSheet } from '@/features/transfers/components/EditTransferSheet';
import { EditCategorySheet } from '@/features/categories/components/EditCategorySheet';
import { AddTransactionSheet } from '@/features/transactions/components/AddTransactionSheet';
import { EditTransactionSheet } from '@/features/transactions/components/EditTransactionSheet';

export const SheetProvider = ({ children }: { children: React.ReactNode }) => {
  const isMounted = useMountedState();

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AddAccount />
      <EditAccountSheet />

      <AddCategorySheet />
      <EditCategorySheet />

      <AddTransactionSheet />
      <EditTransactionSheet />

      <AddTransferSheet />
      <EditTransferSheet />
      {children}
    </>
  );
};
