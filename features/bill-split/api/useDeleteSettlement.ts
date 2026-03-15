import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useDeleteSettlement = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.api['split-settlements'][':id'].$delete({ param: { id } });
      if (!response.ok) throw new Error('Failed to delete settlement');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Settlement deleted');
      queryClient.invalidateQueries({ queryKey: ['split-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['split-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: () => {
      toast.error('Failed to delete settlement');
    }
  });
};
