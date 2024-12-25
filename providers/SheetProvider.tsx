'use client';

import { useMountedState } from 'react-use';

import { AddAccount } from '@/features/accounts/components/AddAccount';
import { EditAccountSheet } from '@/features/accounts/components/EditAccountSheet';
import { AddCategorySheet } from '@/features/categories/components/AddCategorySheet';
import { EditCategorySheet } from '@/features/categories/components/EditCategorySheet';

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
      {children}
    </>
  );
};
