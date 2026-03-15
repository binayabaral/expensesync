import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetAllExpenses = () => {
  return useQuery({
    queryKey: ['split-expenses', 'all'],
    queryFn: async () => {
      const response = await client.api['split-expenses'].$get({ query: { all: 'true' } });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const { data } = await response.json();
      return data;
    }
  });
};
