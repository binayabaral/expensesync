import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetContacts = () => {
  return useQuery({
    queryKey: ['split-contacts'],
    queryFn: async () => {
      const response = await client.api['split-contacts'].$get();
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const { data } = await response.json();
      return data;
    }
  });
};
