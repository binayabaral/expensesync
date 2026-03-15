import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetGroupExpenses = (groupId: string) => {
  return useQuery({
    queryKey: ['split-expenses', 'group', groupId],
    queryFn: async () => {
      const response = await client.api['split-expenses'].$get({ query: { groupId } });
      if (!response.ok) throw new Error('Failed to fetch group expenses');
      const { data } = await response.json();
      return data;
    },
    enabled: !!groupId
  });
};
