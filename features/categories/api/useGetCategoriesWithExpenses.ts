import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';
import { useSearchParams } from 'next/navigation';

export const useGetCategoriesWithExpenses = () => {
  const params = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const accountId = params.get('accountId') || '';

  const query = useQuery({
    queryKey: ['categoriesWithExpenses', { from, to, accountId }],
    queryFn: async () => {
      const response = await client.api.categories['with-expenses'].$get({ query: { from, to, accountId } });

      if (!response.ok) {
        throw new Error('Failed to fetch categories with expenses');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};
