import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType } from 'hono';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<typeof client.api['split-expenses'][':id']['$patch']>['json'];

export const useEditExpense = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api['split-expenses'][':id'].$patch({ param: { id }, json });
      if (!response.ok) throw new Error('Failed to update expense');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Expense updated');
      queryClient.invalidateQueries({ queryKey: ['split-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['split-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-balances'] });
      queryClient.invalidateQueries({ queryKey: ['split-group-member-debts'] });
    },
    onError: () => {
      toast.error('Failed to update expense');
    }
  });
};
