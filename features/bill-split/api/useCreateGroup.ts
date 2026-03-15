import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType } from 'hono';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<typeof client.api['split-groups']['$post']>['json'];

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api['split-groups'].$post({ json });
      if (!response.ok) throw new Error('Failed to create group');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Group created');
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
    },
    onError: () => {
      toast.error('Failed to create group');
    }
  });
};
