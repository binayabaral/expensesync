import { useQuery } from '@tanstack/react-query';
import { InferResponseType } from 'hono';

import { client } from '@/lib/hono';

export type RecurringPaymentResponse = InferResponseType<
  (typeof client.api)['recurring-payments'][':id']['$get'],
  200
>['data'];

export const useGetRecurringPayment = (id?: string) => {
  const query = useQuery({
    enabled: !!id,
    queryKey: ['recurring-payment', { id }],
    queryFn: async () => {
      const response = await client.api['recurring-payments'][':id'].$get({ param: { id: id || '' } });

      if (!response.ok) {
        throw new Error('Failed to fetch recurring payment');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
};
