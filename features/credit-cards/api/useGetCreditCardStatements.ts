import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type Params = {
  accountId?: string;
  status?: 'paid' | 'unpaid';
};

export const useGetCreditCardStatements = ({ accountId, status }: Params) => {
  const query = useQuery({
    enabled: !!accountId,
    queryKey: ['credit-card-statements', { accountId, status }],
    queryFn: async () => {
      const query = {
        accountId: accountId ?? ''
      } as { accountId: string; status?: 'paid' | 'unpaid' };

      if (status) {
        query.status = status;
      }

      const response = await client.api['credit-card-statements'].$get({
        query
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credit card statements');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};
