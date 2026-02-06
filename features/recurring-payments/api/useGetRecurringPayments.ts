import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetRecurringPayments = () => {
  const query = useQuery({
    queryKey: ['recurring-payments'],
    queryFn: async () => {
      const response = await client.api['recurring-payments'].$get();

      if (!response.ok) {
        throw new Error('Failed to fetch recurring payments');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};
