import { useQuery } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useGetCreditCardStatementPreview = (accountId?: string) => {
  const tzOffsetMinutes = new Date().getTimezoneOffset();

  const query = useQuery({
    enabled: !!accountId,
    queryKey: ['credit-card-statement-preview', { accountId, tzOffsetMinutes }],
    queryFn: async () => {
      const response = await client.api['credit-card-statements'].preview.$get({
        query: {
          accountId: accountId ?? '',
          tzOffsetMinutes: tzOffsetMinutes.toString()
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statement preview');
      }

      const result = await response.json();

      return result;
    },
    retry: false
  });

  return query;
};
