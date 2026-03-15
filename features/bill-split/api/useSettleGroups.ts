import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useSettleGroups = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, date }: { contactId: string; date: Date }) => {
      const response = await client.api['split-settlements']['settle-groups'].$post({
        json: { contactId, date }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error((err as { error?: string })?.error ?? 'Failed to settle groups');
      }
      return (await response.json()).data;
    },
    onSuccess: (data) => {
      toast.success(`Settled ${data.length} group${data.length === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['split-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['split-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to settle groups');
    }
  });
};
