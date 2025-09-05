'use client';

import qs from 'query-string';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetSummary } from '@/features/summary/api/useGetSummary';

function FilterAccount() {
  const router = useRouter();
  const pathname = usePathname();

  const params = useSearchParams();
  const to = params.get('to') || '';
  const from = params.get('from') || '';
  const accountId = params.get('accountId') || 'all';

  const { isLoading: isLoadingSummary } = useGetSummary();
  const { data: accounts, isLoading: isLoadingAccounts } = useGetAccounts();

  const onAccountChange = (newValue: string) => {
    const query = {
      to,
      from,
      accountId: newValue
    };

    if (newValue === 'all') {
      query.accountId = '';
    }

    const url = qs.stringifyUrl(
      {
        url: pathname,
        query
      },
      { skipNull: true, skipEmptyString: true }
    );

    router.push(url);
  };

  return (
    <Select value={accountId} onValueChange={onAccountChange} disabled={isLoadingAccounts || isLoadingSummary}>
      <SelectTrigger className='w-full lg:w-auto h-9 rounded-md px-3 font-normal bg-primary/10 hover:bg-primary/20 hover:text-primary border-none focus:ring-offset-0 focus:ring-transparent outline-none text-primary transition'>
        <SelectValue placeholder='Account' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>All Accounts</SelectItem>
        {accounts?.map(account => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default FilterAccount;
