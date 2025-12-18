import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetAssetLots = (assetId?: string) => {
  const query = useQuery({
    enabled: !!assetId,
    queryKey: ['assetLots', { assetId }],
    queryFn: async () => {
      const response = await client.api.assets[':id']['lots'].$get({ param: { id: assetId } });

      if (!response.ok) {
        throw new Error('Failed to fetch asset lots');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};


