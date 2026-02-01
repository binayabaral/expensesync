'use client';

import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useAddAccount } from '@/features/accounts/hooks/useAddAccounts';
import { useBulkDeleteAccount } from '@/features/accounts/api/useBulkDelete';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { columns } from './columns';

function Accounts() {
  const newAccount = useAddAccount();
  const accountsQuery = useGetAccounts();
  const deleteAccounts = useBulkDeleteAccount();

  const accounts = accountsQuery.data || [];
  const isDisabled = accountsQuery.isLoading || deleteAccounts.isPending;

  if (accountsQuery.isLoading) {
    return (
      <div className='container mx-auto px-2 pb-5'>
        <Card className='border border-slate-200 shadow-none'>
          <CardHeader>
            <Skeleton className='h-8 w-48' />
          </CardHeader>
          <CardContent>
            <div className='h-80 w-full flex items-center justify-center'>
              <Loader2 className='size-12 text-slate-300 animate-spin' />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-2 pb-5'>
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-xl md:text-2xl'>Accounts</CardTitle>
          <Button onClick={newAccount.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={accounts}
            onDeleteAction={row => {
              const ids = row.map(r => r.original.id);
              deleteAccounts.mutate({ ids });
            }}
            disabled={isDisabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default Accounts;
