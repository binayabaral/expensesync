import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType } from 'hono';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<typeof client.api['split-settlements'][':id']['$patch']>['json'];

export const useEditSettlement = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api['split-settlements'][':id'].$patch({ param: { id }, json });
      if (!response.ok) throw new Error('Failed to update settlement');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Settlement updated');
      queryClient.invalidateQueries({ queryKey: ['split-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['split-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: () => {
      toast.error('Failed to update settlement');
    }
  });
};
