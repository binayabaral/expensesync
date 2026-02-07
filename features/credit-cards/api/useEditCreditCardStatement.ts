import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api['credit-card-statements'])[':id']['$patch']>;
type RequestType = InferRequestType<(typeof client.api['credit-card-statements'])[':id']['$patch']>['json'];

export const useEditCreditCardStatement = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api['credit-card-statements'][':id'].$patch({ json, param: { id } });

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Statement updated');
      queryClient.invalidateQueries({ queryKey: ['credit-card-statements'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: () => {
      toast.error('Failed to update statement');
    }
  });

  return mutation;
};
