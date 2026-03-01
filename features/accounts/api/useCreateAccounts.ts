import { toast } from 'sonner';
import { InferRequestType, InferResponseType } from 'hono';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client } from '@/lib/hono';
import { useAddRecurringPayment } from '@/features/recurring-payments/hooks/useAddRecurringPayment';

type RequestType = InferRequestType<typeof client.api.accounts.$post>['json'];
type ResponseType = InferResponseType<typeof client.api.accounts.$post, 200>;

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  const addRecurringPayment = useAddRecurringPayment();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async json => {
      const response = await client.api.accounts.$post({ json });
      if (!response.ok) throw new Error('Failed to create account');
      return await response.json() as ResponseType;
    },
    onSuccess: (data, variables) => {
      toast.success('Account created');
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });

      if (variables.accountType === 'LOAN' && variables.loanSubType === 'EMI') {
        const createdAccount = data.data;
        toast('Set up recurring EMI payment?', {
          action: {
            label: 'Set up',
            onClick: () => {
              addRecurringPayment.onOpen({
                toAccountId: createdAccount.id,
                dayOfMonth: createdAccount.paymentDueDay ?? undefined
              });
            }
          },
          duration: 8000
        });
      }
    },
    onError: () => {
      toast.error('Failed to create account');
    }
  });

  return mutation;
};
