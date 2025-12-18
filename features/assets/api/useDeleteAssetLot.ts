import { toast } from 'sonner';
import { InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.assets)['lots'][':id']['$delete']>;
type LotsResponse = InferResponseType<(typeof client.api.assets)[':id']['lots']['$get'], 200>['data'];

export const useDeleteAssetLot = (assetId?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, string>({
    mutationFn: async id => {
      const response = await client.api.assets.lots[':id'].$delete({ param: { id } });

      return await response.json();
    },
    onSuccess: (_data, id) => {
      toast.success('Asset buy deleted');
      // Optimistically update lots list for this asset so the table refreshes immediately
      if (assetId) {
        queryClient.setQueryData<LotsResponse | undefined>(['assetLots', assetId], old =>
          old ? old.filter(lot => lot.id !== id) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assetLots'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error('Failed to delete asset buy');
    }
  });

  return mutation;
};


