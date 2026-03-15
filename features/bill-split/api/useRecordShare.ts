import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type RecordShareParams = {
  expenseId: string;
  shareId: string;
  categoryId?: string | null;
  date: Date;
  actualAccountId?: string;
  notes?: string | null;
};

export const useRecordShare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, shareId, categoryId, date, actualAccountId, notes }: RecordShareParams) => {
      const response = await client.api['split-expenses'][':id'].shares[':shareId'].record.$post({
        param: { id: expenseId, shareId },
        json: { categoryId: categoryId ?? null, date, actualAccountId: actualAccountId ?? null, notes: notes ?? null }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error((err as { error?: string })?.error ?? 'Failed to record share');
      }
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Share recorded as transaction');
      queryClient.invalidateQueries({ queryKey: ['split-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record share');
    }
  });
};
