'use client';

import { Button } from '@/components/ui/button';
import { useAddAccount } from '@/features/accounts/hooks/useAddAccounts';

export default function Home() {
  const { onOpen } = useAddAccount();
  return (
    <div>
      <Button onClick={onOpen}>Add an account</Button>
    </div>
  );
}
