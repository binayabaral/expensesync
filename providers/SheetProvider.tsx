'use client';

import { useMountedState } from 'react-use';

import { AddAccount } from '@/features/accounts/components/AddAccount';
import { EditAccountSheet } from '@/features/accounts/components/EditAccountSheet';

export const SheetProvider = ({ children }: { children: React.ReactNode }) => {
  const isMounted = useMountedState();

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AddAccount />
      <EditAccountSheet />
      {children}
    </>
  );
};
