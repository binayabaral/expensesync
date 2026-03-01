import { toast } from 'sonner';
import { InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type ResponseType = InferResponseType<(typeof client.api.loans)[':id']['close']['$patch']>;

export const useCloseLoan = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      if (!id) throw new Error('Loan id is required');
      const response = await client.api.loans[':id'].close.$patch({ param: { id } });
      return await response.json();
    },
    onSuccess: () => {
      toast.success('Loan archived');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
    },
    onError: () => {
      toast.error('Failed to archive loan');
    }
  });

  return mutation;
};
