import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetAsset = (id?: string) => {
  const query = useQuery({
    enabled: !!id,
    queryKey: ['asset', { id }],
    queryFn: async () => {
      const response = await client.api.assets[':id'].$get({ param: { id } });

      if (!response.ok) {
        throw new Error('Failed to fetch asset');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};


