import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

export const useEnroll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.api['split-enrollment'].$post();
      if (!response.ok) throw new Error('Failed to enroll');
      return (await response.json()).data;
    },
    onSuccess: () => {
      toast.success('Welcome to Bill Split!');
      queryClient.invalidateQueries({ queryKey: ['split-enrollment'] });
    },
    onError: () => {
      toast.error('Failed to enroll. Please try again.');
    }
  });
};
