import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetGroup = (id: string) => {
  return useQuery({
    queryKey: ['split-groups', id],
    queryFn: async () => {
      const response = await client.api['split-groups'][':id'].$get({ param: { id } });
      if (!response.ok) throw new Error('Failed to fetch group');
      const { data } = await response.json();
      return data;
    },
    enabled: !!id
  });
};
