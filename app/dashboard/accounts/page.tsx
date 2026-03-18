'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useAddAccount } from '@/features/accounts/hooks/useAddAccounts';
import { useBulkDeleteAccount } from '@/features/accounts/api/useBulkDelete';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { columns } from './columns';
import { Suspense } from 'react';
import { DEFAULT_CURRENCY } from '@/lib/utils';

function Accounts() {
  const [showClosed, setShowClosed] = useState(false);
  const newAccount = useAddAccount();
  const accountsQuery = useGetAccounts();
  const deleteAccounts = useBulkDeleteAccount();

  const allAccounts = accountsQuery.data || [];
  const visibleAccounts = showClosed ? allAccounts : allAccounts.filter(a => !a.isClosed && a.accountType !== 'BILL_SPLIT');
  const nprAccounts = visibleAccounts.filter(a => (a.currency ?? DEFAULT_CURRENCY) === DEFAULT_CURRENCY);
  const foreignAccounts = visibleAccounts.filter(a => (a.currency ?? DEFAULT_CURRENCY) !== DEFAULT_CURRENCY);
  const isDisabled = accountsQuery.isLoading || deleteAccounts.isPending;

  if (accountsQuery.isLoading) {
    return (
      <div className='max-w-full'>
        <Card className='border border-border shadow-none'>
          <CardHeader>
            <Skeleton className='h-8 w-48' />
          </CardHeader>
          <CardContent>
            <div className='h-80 w-full flex items-center justify-center'>
              <Loader2 className='size-12 text-muted-foreground animate-spin' />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='max-w-full'>
      <Card className='border border-border shadow-none'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-lg font-semibold'>Accounts</CardTitle>
          <div className='flex items-center gap-4'>
            <label className='flex items-center gap-2 text-sm text-muted-foreground cursor-pointer'>
              <Switch checked={showClosed} onCheckedChange={setShowClosed} />
              Show all
            </label>
            <Button onClick={newAccount.onOpen}>
              <Plus className='size-4 mr-2' />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={nprAccounts}
            onDeleteAction={row => {
              const ids = row.map(r => r.original.id);
              deleteAccounts.mutate({ ids });
            }}
            disabled={isDisabled}
          />
        </CardContent>
      </Card>
      {foreignAccounts.length > 0 && (
        <Card className='border border-border shadow-none mt-4'>
          <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
            <div>
              <CardTitle className='text-lg font-semibold'>Foreign Currency Accounts</CardTitle>
              <p className='text-sm text-muted-foreground mt-1'>Balances shown in each account&apos;s native currency — not included in NPR summary</p>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={foreignAccounts}
              onDeleteAction={row => {
                const ids = row.map(r => r.original.id);
                deleteAccounts.mutate({ ids });
              }}
              disabled={isDisabled}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const Page = () => {
  return (
    <Suspense>
      <Accounts />
    </Suspense>
  );
};

export default Page;
