import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType, InferResponseType } from 'hono';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api)['recurring-payments']['$post']>;
type RequestType = InferRequestType<(typeof client.api)['recurring-payments']['$post']>['json'];

export const useCreateRecurringPayment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api['recurring-payments'].$post({ json });

      if (!response.ok) {
        throw new Error('Failed to create recurring payment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
    }
  });

  return mutation;
};
