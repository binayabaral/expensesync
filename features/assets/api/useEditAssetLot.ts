import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.assets)['lots'][':id']['$patch']>;
type RequestType = InferRequestType<(typeof client.api.assets)['lots'][':id']['$patch']>['json'];

export const useEditAssetLot = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api.assets.lots[':id'].$patch({ json, param: { id } });

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Asset buy updated');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assetLots'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error('Failed to update asset buy');
    }
  });

  return mutation;
};


