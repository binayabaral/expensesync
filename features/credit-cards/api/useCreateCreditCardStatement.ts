import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<typeof client.api['credit-card-statements']['$post']>;
type RequestType = InferRequestType<typeof client.api['credit-card-statements']['$post']>['json'];

export const useCreateCreditCardStatement = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api['credit-card-statements'].$post({ json });

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Statement closed');
      queryClient.invalidateQueries({ queryKey: ['credit-card-statements'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: () => {
      toast.error('Failed to close statement');
    }
  });

  return mutation;
};
