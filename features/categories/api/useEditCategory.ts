import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';

type RequestType = InferRequestType<(typeof client.api.categories)[':id']['$patch']>['json'];
type ResponseType = InferResponseType<(typeof client.api.categories)[':id']['$patch']>;

export const useEditCategory = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api.categories[':id'].$patch({ json, param: { id } });

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Category updated');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => {
      toast.error('Failed to update category');
    }
  });

  return mutation;
};
