import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferResponseType } from 'hono';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api)['recurring-payments'][':id']['$delete']>;

export const useDeleteRecurringPayment = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api['recurring-payments'][':id'].$delete({ param: { id: id || '' } });

      if (!response.ok) {
        throw new Error('Failed to delete recurring payment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
    }
  });

  return mutation;
};
