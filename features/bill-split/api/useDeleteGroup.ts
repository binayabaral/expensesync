import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useDeleteGroup = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.api['split-groups'][':id'].$delete({ param: { id } });
      if (!response.ok) throw new Error('Failed to delete group');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Group deleted');
      queryClient.invalidateQueries({ queryKey: ['split-groups'] });
    },
    onError: () => {
      toast.error('Failed to delete group');
    }
  });
};
