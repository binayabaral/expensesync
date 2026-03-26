'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import { DataTable } from '@/components/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetPayeesWithExpenses } from '@/features/payees/api/useGetPayeesWithExpenses';

import { BuildColumns } from './columns';

function Payees() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periods = searchParams.get('periods') || '6';

  const setPeriods = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('periods', value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const payeesQuery = useGetPayeesWithExpenses();

  const payees = payeesQuery.data || [];

  const columns = BuildColumns(payees);

  if (payeesQuery.isLoading) {
    return (
      <div className='flex flex-col flex-1 min-h-0'>
        <Card className='border border-border shadow-none flex flex-col flex-1 min-h-0'>
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
    <div className='flex flex-col flex-1 min-h-0'>
      <Card className='border border-border shadow-none flex flex-col flex-1 min-h-0'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-lg font-semibold'>Payees</CardTitle>
          <Select value={periods} onValueChange={setPeriods}>
            <SelectTrigger className='w-36'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='6'>6 months</SelectItem>
              <SelectItem value='12'>12 months</SelectItem>
              <SelectItem value='all'>All time</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className='flex flex-col flex-1 min-h-0 pb-4'>
          <DataTable hasFooter columns={columns} data={payees} pinnedColumns={1} />
        </CardContent>
      </Card>
    </div>
  );
}

const Page = () => {
  return (
    <Suspense>
      <Payees />
    </Suspense>
  );
};

export default Page;
