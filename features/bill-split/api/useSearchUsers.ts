import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useSearchUsers = (email: string) => {
  return useQuery({
    queryKey: ['split-user-search', email],
    queryFn: async () => {
      const response = await client.api['split-contacts'].search.$get({ query: { email } });
      if (!response.ok) throw new Error('Failed to search users');
      const { data } = await response.json();
      return data;
    },
    enabled: email.length >= 3
  });
};
