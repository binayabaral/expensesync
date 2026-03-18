import { z } from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { startOfMinute } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { convertAmountFromMiliUnits, convertAmountToMiliUnits, DEFAULT_CURRENCY } from '@/lib/utils';
import { AmountInput } from '@/components/AmountInput';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import type { SettlementGroupMember } from '../hooks/useOpenAddSettlementSheet';

const formSchema = z.object({
  amount: z.string().min(1, 'Amount required'),
  date: z.date(),
  contactId: z.string().min(1, 'Select who to settle with'),
  direction: z.enum(['paying', 'receiving']),
  recordTransaction: z.boolean(),
  accountId: z.string().nullable(),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  defaults?: {
    contactId?: string;
    contactName?: string;
    direction?: 'paying' | 'receiving';
    groupId?: string | null;
    groupName?: string;
    groupMembers?: SettlementGroupMember[];
    initialAmount?: number;
    initialDate?: Date;
    initialNotes?: string | null;
    initialAccountId?: string | null;
  };
  disabled?: boolean;
  submitLabel?: string;
  onSubmit: (values: {
    amount: number;
    date: Date;
    fromIsUser: boolean;
    fromContactId: string | null;
    toIsUser: boolean;
    toContactId: string | null;
    accountId: string | null;
    groupId: string | null;
    notes: string | null;
  }) => void;
};

export function SettlementForm({ defaults, disabled, submitLabel = 'Record settlement', onSubmit }: Props) {
  const accountsQuery = useGetAccounts();
  const accounts = (accountsQuery.data ?? []).filter(a => !a.isHidden);
  const accountOptions = accounts.map(a => ({ label: a.name, value: a.id }));

  const groupMembers = defaults?.groupMembers ?? [];
  const isGroupContext = groupMembers.length > 0;
  const initialContactId = defaults?.contactId ?? (groupMembers[0]?.contactId ?? '');
  const initialMember = groupMembers.find(m => m.contactId === initialContactId) ?? groupMembers[0];
  const initialDirection = defaults?.direction
    ?? (initialMember?.netAmount != null
        ? (initialMember.netAmount < 0 ? 'paying' : 'receiving')
        : 'paying');
  const hasInitialAccount = !!defaults?.initialAccountId;
  const initialAmountStr = defaults?.initialAmount != null
    ? String(convertAmountFromMiliUnits(defaults.initialAmount))
    : '';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialAmountStr,
      date: defaults?.initialDate ? startOfMinute(defaults.initialDate) : startOfMinute(new Date()),
      contactId: initialContactId,
      direction: initialDirection,
      recordTransaction: hasInitialAccount,
      accountId: defaults?.initialAccountId ?? null,
      notes: defaults?.initialNotes ?? ''
    }
  });

  const direction = form.watch('direction');
  const contactId = form.watch('contactId');
  const recordTransaction = form.watch('recordTransaction');

  const selectedMember = groupMembers.find(m => m.contactId === contactId);
  const contactName = selectedMember?.contactName ?? defaults?.contactName ?? 'Contact';

  // Auto-set direction based on the selected member's balance when contactId changes
  useEffect(() => {
    if (!isGroupContext) return;
    if (selectedMember?.netAmount == null) return;
    const autoDirection = selectedMember.netAmount < 0 ? 'paying' : 'receiving';
    form.setValue('direction', autoDirection);
  }, [contactId]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberNetAmount = selectedMember?.netAmount;
  const balanceHint = memberNetAmount != null && memberNetAmount !== 0
    ? (memberNetAmount < 0
        ? `You owe ${contactName}`
        : `${contactName} owes you`)
    : null;

  function handleSubmit(values: FormValues) {
    const fromIsUser = values.direction === 'paying';
    const toIsUser = values.direction === 'receiving';

    onSubmit({
      amount: convertAmountToMiliUnits(parseFloat(values.amount)),
      date: values.date,
      fromIsUser,
      fromContactId: fromIsUser ? null : values.contactId,
      toIsUser,
      toContactId: toIsUser ? null : values.contactId,
      accountId: values.recordTransaction ? (values.accountId ?? null) : null,
      groupId: defaults?.groupId ?? null,
      notes: values.notes || null
    });
  }

  const directionLabel = direction === 'paying'
    ? `You → ${contactName}`
    : `${contactName} → You`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>

        {/* Member selector — group context only */}
        {isGroupContext && (
          <FormField
            control={form.control}
            name='contactId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Settle with</FormLabel>
                <FormControl>
                  <ResponsiveSelect
                    value={field.value}
                    options={groupMembers.map(m => ({ label: m.contactName, value: m.contactId }))}
                    placeholder='Select member'
                    disabled={disabled}
                    onChangeAction={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Direction toggle */}
        <FormField
          control={form.control}
          name='direction'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center justify-between'>
                <FormLabel>Direction</FormLabel>
                {balanceHint && (
                  <span className='text-xs text-muted-foreground'>{balanceHint}</span>
                )}
              </div>
              <FormControl>
                <div className='flex gap-1.5'>
                  <button
                    type='button'
                    disabled={disabled}
                    onClick={() => field.onChange('paying')}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      field.value === 'paying'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    I&apos;m paying
                  </button>
                  <button
                    type='button'
                    disabled={disabled}
                    onClick={() => field.onChange('receiving')}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      field.value === 'receiving'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    I&apos;m receiving
                  </button>
                </div>
              </FormControl>
              <div className='rounded-md border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground mt-1'>
                {directionLabel}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='date'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DateTimePicker hourCycle={12} value={field.value} onChange={field.onChange} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='amount'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput {...field} disabled={disabled} placeholder='0.00' currency={DEFAULT_CURRENCY} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='notes'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder='e.g. Cash repayment' disabled={disabled} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Record as transaction — only shown when user has accounts */}
        {accountOptions.length > 0 && (
          <FormField
            control={form.control}
            name='recordTransaction'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between rounded-md border px-3 py-2'>
                  <div>
                    <p className='text-sm font-medium'>Record as transaction</p>
                    <p className='text-xs text-muted-foreground'>Track this in your account ledger</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
        )}

        {/* Account selector — shown when recording */}
        {recordTransaction && (
          <FormField
            control={form.control}
            name='accountId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{direction === 'paying' ? 'Pay from account' : 'Receive into account'}</FormLabel>
                <FormControl>
                  <ResponsiveSelect
                    value={field.value ?? ''}
                    options={accountOptions}
                    placeholder='Select account'
                    disabled={disabled || accountsQuery.isLoading}
                    onChangeAction={val => field.onChange(val || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type='submit' disabled={disabled} className='w-full'>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
