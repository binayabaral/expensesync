import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetBalances = () => {
  return useQuery({
    queryKey: ['split-balances'],
    queryFn: async () => {
      const response = await client.api['split-balances'].$get();
      if (!response.ok) throw new Error('Failed to fetch balances');
      const { data } = await response.json();
      return data;
    }
  });
};
