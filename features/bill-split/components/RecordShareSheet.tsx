'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { startOfMinute } from 'date-fns';
import { FaTrash } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { formatCurrency } from '@/lib/utils';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { useCreateCategory } from '@/features/categories/api/useCreateCategory';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useOpenRecordShareSheet } from '../hooks/useOpenRecordShareSheet';
import { useRecordShare } from '../api/useRecordShare';
import { useEditRecordedShare } from '../api/useEditRecordedShare';
import { useDeleteRecordedShare } from '../api/useDeleteRecordedShare';

type FormValues = {
  date: Date;
  categoryId: string;
  actualAccountId: string;
  notes: string;
};

export function RecordShareSheet() {
  const {
    isOpen, onClose,
    expenseId, shareId, shareAmount, totalAmount, paidByUser, contextName,
    categoryId: presetCategoryId,
    transactionId, initialDate, initialNotes, initialAccountId
  } = useOpenRecordShareSheet();

  const isEditMode = !!transactionId;

  const { mutate: recordShare, isPending: isRecording } = useRecordShare();
  const { mutate: editShare, isPending: isEditing } = useEditRecordedShare();
  const { mutate: deleteShare, isPending: isDeleting } = useDeleteRecordedShare();
  const isPending = isRecording || isEditing || isDeleting;

  const categoriesQuery = useGetCategories();
  const categoryMutation = useCreateCategory();
  const accountsQuery = useGetAccounts();

  const categoryOptions = (categoriesQuery.data ?? []).map(c => ({ label: c.name, value: c.id }));
  const hasCategories = categoryOptions.length > 0;
  const isCategoryPreset = !isEditMode && !!presetCategoryId && categoryOptions.some(o => o.value === presetCategoryId);
  const accountOptions = (accountsQuery.data ?? [])
    .filter(a => a.accountType !== 'BILL_SPLIT' && !a.isClosed)
    .map(a => ({ label: a.name, value: a.id }));
  const hasAccounts = accountOptions.length > 0;

  const isLoading = categoriesQuery.isLoading || accountsQuery.isLoading;
  const receivableAmount = paidByUser && shareAmount && totalAmount ? totalAmount - shareAmount : 0;

  const form = useForm<FormValues>({
    defaultValues: { date: startOfMinute(new Date()), categoryId: '', actualAccountId: '', notes: '' }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        date: initialDate ? startOfMinute(initialDate) : startOfMinute(new Date()),
        categoryId: isEditMode
          ? (presetCategoryId ?? '')
          : (isCategoryPreset ? (presetCategoryId ?? '') : ''),
        actualAccountId: initialAccountId ?? '',
        notes: initialNotes ?? ''
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleClose() {
    form.reset({ date: startOfMinute(new Date()), categoryId: '', actualAccountId: '', notes: '' });
    onClose();
  }

  function handleSubmit(values: FormValues) {
    if (!expenseId || !shareId) return;

    if (isEditMode) {
      editShare(
        { expenseId, shareId, categoryId: values.categoryId || null, date: values.date, notes: values.notes || null },
        { onSuccess: handleClose }
      );
    } else {
      if (paidByUser && !values.actualAccountId) return;
      recordShare(
        {
          expenseId,
          shareId,
          categoryId: values.categoryId || null,
          date: values.date,
          actualAccountId: paidByUser ? values.actualAccountId : undefined,
          notes: values.notes || null
        },
        { onSuccess: handleClose }
      );
    }
  }

  function handleDelete() {
    if (!expenseId || !shareId) return;
    if (!confirm('Delete this recording? The linked transaction(s) will also be removed.')) return;
    deleteShare({ expenseId, shareId }, { onSuccess: handleClose });
  }

  const watchedAccountId = form.watch('actualAccountId');

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className='space-y-4' tabIndex={undefined}>
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit recording' : 'Record on my account'}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Update the recorded transaction for your share.'
              : 'Record your share of this expense as a transaction.'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Loader2 className='size-4 text-muted-foreground animate-spin' />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4 pt-4'>
              {!isEditMode && paidByUser && (
                <div className='rounded-md border bg-muted/40 p-3 space-y-1.5 text-sm'>
                  <p className='font-medium'>Two transactions will be created:</p>
                  <p className='text-muted-foreground'>
                    1. Expense — {shareAmount ? formatCurrency(shareAmount) : '—'} deducted from your selected account (counts as expense)
                  </p>
                  <p className='text-muted-foreground'>
                    2. Receivable — {receivableAmount ? formatCurrency(receivableAmount) : '—'} tracked in your bill split account (others owe you)
                  </p>
                </div>
              )}

              <FormField
                name='date'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DateTimePicker hourCycle={12} value={field.value} onChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isEditMode && (
                paidByUser && hasAccounts ? (
                  <FormField
                    name='actualAccountId'
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account you paid from</FormLabel>
                        <FormControl>
                          <ResponsiveSelect
                            value={field.value}
                            options={accountOptions}
                            placeholder='Select account'
                            disabled={isPending}
                            onChangeAction={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className='space-y-2'>
                    <Label>Account</Label>
                    <Input
                      value={contextName ? `BILL SPLIT: ${contextName}` : ''}
                      disabled
                      className='bg-muted'
                    />
                    <p className='text-xs text-muted-foreground'>Virtual bill split account — auto-assigned</p>
                  </div>
                )
              )}

              <div className='space-y-2'>
                <Label>Your share</Label>
                <Input value={shareAmount ? formatCurrency(shareAmount) : ''} disabled className='bg-muted' />
              </div>

              {hasCategories && (
                <FormField
                  name='categoryId'
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <ResponsiveSelect
                          value={field.value ?? ''}
                          options={categoryOptions}
                          placeholder='Select category'
                          disabled={isPending || isCategoryPreset}
                          allowCreatingOptions={!isCategoryPreset}
                          onCreate={name => categoryMutation.mutate({ name })}
                          onChangeAction={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                name='notes'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} disabled={isPending} placeholder='Add a note' />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button
                type='submit'
                className='w-full'
                disabled={isPending || (!isEditMode && paidByUser && hasAccounts && !watchedAccountId)}
              >
                {isPending && !isDeleting
                  ? (isEditMode ? 'Saving...' : 'Recording...')
                  : (isEditMode ? 'Save changes' : 'Record transaction')}
              </Button>

              {isEditMode && (
                <Button
                  type='button'
                  variant='ghost'
                  className='w-full text-destructive hover:text-destructive'
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  <FaTrash className='h-3.5 w-3.5 mr-2' />
                  {isDeleting ? 'Deleting...' : 'Delete recording'}
                </Button>
              )}
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
