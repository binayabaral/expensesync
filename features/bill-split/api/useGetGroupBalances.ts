import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetGroupBalances = (groupId: string) => {
  return useQuery({
    queryKey: ['split-group-balances', groupId],
    queryFn: async () => {
      const response = await client.api['split-groups'][':id']['balances'].$get({ param: { id: groupId } });
      if (!response.ok) throw new Error('Failed to fetch group balances');
      const { data } = await response.json();
      return data;
    },
    enabled: !!groupId
  });
};
