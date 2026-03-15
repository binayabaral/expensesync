import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType } from 'hono';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<typeof client.api['split-groups'][':id']['$patch']>['json'];

export const useEditGroup = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api['split-groups'][':id'].$patch({ param: { id }, json });
      if (!response.ok) throw new Error('Failed to update group');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Group updated');
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
      queryClient.invalidateQueries({ queryKey: ['split-groups', id] });
    },
    onError: () => {
      toast.error('Failed to update group');
    }
  });
};
