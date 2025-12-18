import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetAssets = () => {
  const query = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await client.api.assets.$get();

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};


