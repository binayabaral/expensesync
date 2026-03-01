import { useQuery } from '@tanstack/react-query';
import { InferResponseType } from 'hono';

import { client } from '@/lib/hono';

export type LoanResponseType = InferResponseType<typeof client.api.loans.$get, 200>['data'][0];

export const useGetLoans = () => {
  const query = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const response = await client.api.loans.$get();

      if (!response.ok) {
        throw new Error('Failed to fetch loans');
      }

      const { data } = await response.json();
      return data;
    }
  });

  return query;
};
