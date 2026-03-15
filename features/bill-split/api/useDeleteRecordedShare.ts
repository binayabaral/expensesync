import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useDeleteRecordedShare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, shareId }: { expenseId: string; shareId: string }) => {
      const response = await client.api['split-expenses'][':id'].shares[':shareId'].record.$delete({
        param: { id: expenseId, shareId }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error((err as { error?: string })?.error ?? 'Failed to delete recording');
      }
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Recording deleted');
      queryClient.invalidateQueries({ queryKey: ['split-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete recording');
    }
  });
};
