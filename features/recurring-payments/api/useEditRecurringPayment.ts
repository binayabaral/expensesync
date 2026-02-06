import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType, InferResponseType } from 'hono';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api)['recurring-payments'][':id']['$patch']>;
type RequestType = InferRequestType<(typeof client.api)['recurring-payments'][':id']['$patch']>['json'];

export const useEditRecurringPayment = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api['recurring-payments'][':id'].$patch({
        param: { id: id || '' },
        json
      });

      if (!response.ok) {
        throw new Error('Failed to update recurring payment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-payment', { id }] });
    }
  });

  return mutation;
};
