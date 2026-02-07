import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetCreditCards = () => {
  const query = useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const response = await client.api['credit-cards'].$get();

      if (!response.ok) {
        throw new Error('Failed to fetch credit cards');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};
