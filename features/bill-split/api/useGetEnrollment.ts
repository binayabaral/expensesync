import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetEnrollment = () => {
  return useQuery({
    queryKey: ['split-enrollment'],
    queryFn: async () => {
      const response = await client.api['split-enrollment'].$get();
      if (!response.ok) throw new Error('Failed to fetch enrollment status');
      const { data } = await response.json();
      return data;
    }
  });
};
