import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AmountInput } from '@/components/AmountInput';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useOpenCloseStatementSheet } from '@/features/credit-cards/hooks/useOpenCloseStatementSheet';
import { useGetCreditCardStatementPreview } from '@/features/credit-cards/api/useGetCreditCardStatementPreview';
import { useCreateCreditCardStatement } from '@/features/credit-cards/api/useCreateCreditCardStatement';
import { convertAmountFromMiliUnits, convertAmountToMiliUnits, formatCurrency } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  paymentDueAmount: z.string()
});

type FormValues = z.input<typeof formSchema>;

export const CloseStatementSheet = () => {
  const { isOpen, onClose, accountId } = useOpenCloseStatementSheet();
  const previewQuery = useGetCreditCardStatementPreview(accountId);
  const createStatement = useCreateCreditCardStatement();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { paymentDueAmount: '' }
  });

  const preview = previewQuery.data;
  const isLoading = previewQuery.isLoading || createStatement.isPending;

  useEffect(() => {
    if (preview?.paymentDueAmount !== undefined) {
      form.setValue('paymentDueAmount', convertAmountFromMiliUnits(preview.paymentDueAmount).toString());
    }
  }, [preview, form]);

  const onSubmit = (values: FormValues) => {
    if (!accountId || !preview) {
      return;
    }

    const paymentDueAmount = convertAmountToMiliUnits(parseFloat(values.paymentDueAmount || '0'));
    const override = paymentDueAmount !== preview.paymentDueAmount ? paymentDueAmount : undefined;

    createStatement.mutate(
      {
        accountId,
        paymentDueAmountOverride: override,
        tzOffsetMinutes: new Date().getTimezoneOffset()
      },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  const previewSummary = useMemo(() => {
    if (!preview) {
      return null;
    }

    return {
      statementDate: format(new Date(preview.statementDate), 'MMM dd, yyyy'),
      dueDate: format(new Date(preview.dueDate), 'MMM dd, yyyy'),
      periodStart: format(new Date(preview.periodStart), 'MMM dd, yyyy'),
      statementBalance: formatCurrency(preview.statementBalance),
      minimumPayment: formatCurrency(preview.minimumPayment)
    };
  }, [preview]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>Close Statement</SheetTitle>
          <SheetDescription>Create a new credit card statement for this cycle.</SheetDescription>
        </SheetHeader>
        {previewQuery.isLoading ? (
          <div className='flex justify-center'>
            <Loader2 className='size-12 text-muted-foreground animate-spin' />
          </div>
        ) : preview ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='text-sm text-muted-foreground space-y-1'>
                <div>Statement Period: {previewSummary?.periodStart} - {previewSummary?.statementDate}</div>
                <div>Payment Due: {previewSummary?.dueDate}</div>
                <div>Statement Balance: {previewSummary?.statementBalance}</div>
                <div>Minimum Payment: {previewSummary?.minimumPayment}</div>
              </div>
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
              <Button className='w-full' disabled={isLoading}>
                Close Statement
              </Button>
            </form>
          </Form>
        ) : (
          <div className='text-sm text-muted-foreground'>No statement available to close yet.</div>
        )}
      </SheetContent>
    </Sheet>
  );
};
