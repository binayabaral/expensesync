import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetStandaloneExpenses = () => {
  return useQuery({
    queryKey: ['split-expenses'],
    queryFn: async () => {
      const response = await client.api['split-expenses'].$get({ query: {} });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const { data } = await response.json();
      return data;
    }
  });
};
