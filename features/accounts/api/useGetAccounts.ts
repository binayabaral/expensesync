import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';

import { client } from '@/lib/hono';

export const useGetAccounts = () => {
  const params = useSearchParams();
  const to = params.get('to') || '';

  const query = useQuery({
    queryKey: ['accounts', { to }],
    queryFn: async () => {
      const response = await client.api.accounts.$get({ query: { to } });

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};
