import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.assets)[':id']['sell']['$post']>;
type RequestType = InferRequestType<(typeof client.api.assets)[':id']['sell']['$post']>['json'];

export const useSellAsset = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api.assets[':id'].sell.$post({ json, param: { id } });

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Asset sold');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error('Failed to sell asset');
    }
  });

  return mutation;
};


