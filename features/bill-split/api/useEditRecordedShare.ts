import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type EditShareParams = {
  expenseId: string;
  shareId: string;
  categoryId?: string | null;
  date: Date;
  notes?: string | null;
};

export const useEditRecordedShare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, shareId, categoryId, date, notes }: EditShareParams) => {
      const response = await client.api['split-expenses'][':id'].shares[':shareId'].record.$patch({
        param: { id: expenseId, shareId },
        json: { categoryId: categoryId ?? null, date, notes: notes ?? null }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error((err as { error?: string })?.error ?? 'Failed to update recording');
      }
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Recording updated');
      queryClient.invalidateQueries({ queryKey: ['split-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update recording');
    }
  });
};
