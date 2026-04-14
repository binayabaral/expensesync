import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetGroupMemberDebts = (groupId: string) => {
  return useQuery({
    queryKey: ['split-group-member-debts', groupId],
    queryFn: async () => {
      const response = await client.api['split-groups'][':id']['member-debts'].$get({ param: { id: groupId } });
      if (!response.ok) throw new Error('Failed to fetch member debts');
      const { data } = await response.json();
      return data;
    },
    enabled: !!groupId
  });
};
