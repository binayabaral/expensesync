import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useDeleteExpense = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.api['split-expenses'][':id'].$delete({ param: { id } });
      if (!response.ok) throw new Error('Failed to delete expense');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['split-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['split-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-member-debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: () => {
      toast.error('Failed to delete expense');
    }
  });
};
