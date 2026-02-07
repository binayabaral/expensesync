import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AmountInput } from '@/components/AmountInput';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useEditCreditCardStatement } from '@/features/credit-cards/api/useEditCreditCardStatement';
import { useOpenEditStatementSheet } from '@/features/credit-cards/hooks/useOpenEditStatementSheet';
import { convertAmountFromMiliUnits, convertAmountToMiliUnits, formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  paymentDueAmount: z.string()
});

type FormValues = z.input<typeof formSchema>;

export const EditStatementSheet = () => {
  const { isOpen, onClose, statement } = useOpenEditStatementSheet();
  const editStatement = useEditCreditCardStatement(statement?.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { paymentDueAmount: '' }
  });

  useEffect(() => {
    if (statement) {
      form.setValue('paymentDueAmount', convertAmountFromMiliUnits(statement.paymentDueAmount).toString());
    }
  }, [statement, form]);

  const onSubmit = (values: FormValues) => {
    if (!statement) {
      return;
    }

    const paymentDueAmount = convertAmountToMiliUnits(parseFloat(values.paymentDueAmount || '0'));

    editStatement.mutate(
      { paymentDueAmount },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  const isLoading = editStatement.isPending;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>Override Payment Due</SheetTitle>
          <SheetDescription>Adjust the payment due amount for this statement.</SheetDescription>
        </SheetHeader>
        {!statement ? (
          <div className='flex justify-center'>
            <Loader2 className='size-12 text-muted-foreground animate-spin' />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                name='paymentDueAmount'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Due Amount</FormLabel>
                    <FormControl>
                      <AmountInput {...field} disabled={isLoading} placeholder={'0.00'} allowNegativeValue={false} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className='text-sm text-muted-foreground'>Minimum payment: {formatCurrency(statement.minimumPayment)}</div>
              <Button className='w-full' disabled={isLoading}>
                Save Override
              </Button>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
};
