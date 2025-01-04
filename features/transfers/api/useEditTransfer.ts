import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.transfers)[':id']['$patch']>;
type RequestType = InferRequestType<(typeof client.api.transfers)[':id']['$patch']>['json'];

export const useEditTransfer = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api.transfers[':id'].$patch({ json, param: { id } });

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Transfer updated');
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error('Failed to update transfer');
    }
  });

  return mutation;
};
