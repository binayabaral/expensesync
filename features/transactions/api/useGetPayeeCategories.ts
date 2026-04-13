import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetPayeeCategories = () => {
  return useQuery({
    queryKey: ['payee-categories'],
    queryFn: async () => {
      const response = await client.api.transactions['payee-categories'].$get();

      if (!response.ok) {
        throw new Error('Failed to fetch payee categories');
      }

      const { data } = await response.json();

      return Object.fromEntries(
        data.filter(d => d.categoryId).map(d => [d.payee, d.categoryId as string])
      );
    },
    staleTime: 5 * 60 * 1000
  });
};
