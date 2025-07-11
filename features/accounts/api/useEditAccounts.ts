import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<(typeof client.api.accounts)[':id']['$patch']>['json'];
type ResponseType = InferResponseType<(typeof client.api.accounts)[':id']['$patch']>;

export const useEditAccount = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api.accounts[':id'].$patch({ json, param: { id } });

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Account updated');
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error('Failed to update account');
    }
  });

  return mutation;
};
