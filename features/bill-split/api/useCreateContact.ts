import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType } from 'hono';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<typeof client.api['split-contacts']['$post']>['json'];

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api['split-contacts'].$post({ json });
      if (!response.ok) throw new Error('Failed to create contact');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Contact added');
      queryClient.invalidateQueries({ queryKey: ['split-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['split-balances'] });
    },
    onError: () => {
      toast.error('Failed to add contact');
    }
  });
};
