import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetSettlements = (groupId?: string) => {
  return useQuery({
    queryKey: ['split-settlements', groupId ?? 'all'],
    queryFn: async () => {
      const response = await client.api['split-settlements'].$get();
      if (!response.ok) throw new Error('Failed to fetch settlements');
      const { data } = await response.json();
      return groupId ? data.filter(s => s.groupId === groupId) : data;
    }
  });
};
