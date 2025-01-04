import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetTransfer = (id?: string) => {
  const query = useQuery({
    enabled: !!id,
    queryKey: ['transfer', { id }],
    queryFn: async () => {
      const response = await client.api.transfers[':id'].$get({ param: { id } });

      if (!response.ok) {
        throw new Error('Failed to fetch transfer');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};
