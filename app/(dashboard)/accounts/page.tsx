'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddAccount } from '@/features/accounts/hooks/useAddAccounts';

import { columns, Payment } from './columns';
import { DataTable } from '@/components/DataTable';

const data: Payment[] = [
  {
    id: '728ed52f',
    amount: 100,
    status: 'pending',
    email: 'm@example.com'
  },
  {
    id: 'akhfbia',
    amount: 100,
    status: 'pending',
    email: 'avasfbab@example.com'
  }
  // ...
];

function Accounts() {
  const newAccount = useAddAccount();

  return (
    <div className='container mx-auto pb-10 -mt-24'>
      <Card className='border-none drop-shadow-sm'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between'>
          <CardTitle className='text-xl line-clamp-1'>Accounts Page</CardTitle>
          <Button onClick={newAccount.onOpen}>
            <Plus className='size-4 mr-2' />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} filterKey='email' onDelete={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Accounts;
