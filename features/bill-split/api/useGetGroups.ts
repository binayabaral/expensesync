import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetGroups = () => {
  return useQuery({
    queryKey: ['split-groups'],
    queryFn: async () => {
      const response = await client.api['split-groups'].$get();
      if (!response.ok) throw new Error('Failed to fetch groups');
      const { data } = await response.json();
      return data;
    }
  });
};
