import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType } from 'hono';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<typeof client.api['split-settlements']['$post']>['json'];

export const useCreateSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api['split-settlements'].$post({ json });
      if (!response.ok) throw new Error('Failed to record settlement');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Settlement recorded');
      queryClient.invalidateQueries({ queryKey: ['split-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['split-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-member-debts'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: () => {
      toast.error('Failed to record settlement');
    }
  });
};
