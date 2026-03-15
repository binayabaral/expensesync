import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useAddGroupMember = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      const response = await client.api['split-groups'][':id']['members'].$post({
        param: { id: groupId },
        json: { contactIds }
      });
      if (!response.ok) throw new Error('Failed to add members');
      return (await response.json()).data;
    },
    onSuccess: (_, contactIds) => {
      toast.success(contactIds.length === 1 ? 'Member added' : `${contactIds.length} members added`);
      queryClient.invalidateQueries({ queryKey: ['split-groups', groupId] });
    },
    onError: () => {
      toast.error('Failed to add members');
    }
  });
};
