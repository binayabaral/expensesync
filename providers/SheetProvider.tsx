'use client';

import { useMountedState } from 'react-use';

import { AddAccount } from '@/features/accounts/components/AddAccount';

export const SheetProvider = ({ children }: { children: React.ReactNode }) => {
  const isMounted = useMountedState();

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AddAccount />
      {children}
    </>
  );
};
