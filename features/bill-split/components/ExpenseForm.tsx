import { z } from 'zod';
import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { startOfMinute } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AmountInput } from '@/components/AmountInput';
import { DEFAULT_CURRENCY } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { convertAmountToMiliUnits } from '@/lib/utils';
import { DateTimePicker } from '@/components/ui-extended/Datepicker';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';
import { useGetAccounts } from '@/features/accounts/api/useGetAccounts';
import { useGetContacts } from '../api/useGetContacts';
import { useGetCategories } from '@/features/categories/api/useGetCategories';
import { useCreateCategory } from '@/features/categories/api/useCreateCategory';

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

const shareSchema = z.object({
  label: z.string(),
  contactId: z.string().nullable(),
  isUser: z.boolean(),
  splitValue: z.number().min(0)
});

const formSchema = z.object({
  description: z.string().min(1, 'Description required'),
  totalAmount: z.string().min(1, 'Amount required'),
  date: z.date(),
  paidBy: z.string(), // 'user' or contact id
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  categoryId: z.string().nullable().optional(),
  notes: z.string().optional(),
  shares: z.array(shareSchema),
  recordTransaction: z.boolean(),
  accountId: z.string().nullable()
});

type FormValues = z.infer<typeof formSchema>;

type GroupMember = {
  contactId: string;
  contactName: string;
};

type InitialValues = {
  description?: string;
  totalAmount?: number; // mili-units
  date?: Date;
  paidBy?: string;
  splitType?: SplitType;
  categoryId?: string | null;
  notes?: string | null;
  shares?: { label: string; contactId: string | null; isUser: boolean; splitValue: number }[];
};

type Props = {
  groupId?: string | null;
  groupMembers?: GroupMember[];
  disabled?: boolean;
  initialValues?: InitialValues;
  submitLabel?: string;
  onSubmit: (values: {
    description: string;
    totalAmount: number;
    date: Date;
    paidByUser: boolean;
    paidByContactId: string | null;
    splitType: SplitType;
    categoryId: string | null;
    notes: string | null;
    shares: { contactId: string | null; isUser: boolean; splitValue: number }[];
    recordTransaction: boolean;
    accountId: string | null;
  }) => void;
};

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'EQUAL', label: 'Equal' },
  { value: 'EXACT', label: 'Exact' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'SHARES', label: 'Shares' }
];

export function ExpenseForm({ groupMembers, disabled, initialValues, submitLabel, onSubmit }: Props) {
  const contactsQuery = useGetContacts();
  const contacts = contactsQuery.data ?? [];
  const categoriesQuery = useGetCategories();
  const categoryMutation = useCreateCategory();
  const categoryOptions = (categoriesQuery.data ?? []).map(c => ({ label: c.name, value: c.id }));
  const accountsQuery = useGetAccounts();
  const accountOptions = (accountsQuery.data ?? []).filter(a => !a.isHidden && !a.isClosed && a.accountType !== 'BILL_SPLIT').map(a => ({ label: a.name, value: a.id }));

  const isEditing = !!initialValues;

  // In group context, available participants are the group members.
  // In standalone context, available participants are all contacts.
  const availableContacts = groupMembers
    ? groupMembers.map(m => ({ id: m.contactId, name: m.contactName }))
    : contacts.map(c => ({ id: c.id, name: c.name }));

  const defaultShares = initialValues?.shares ?? (groupMembers
    ? [
        { label: 'You', contactId: null, isUser: true, splitValue: 1 },
        ...groupMembers.map(m => ({ label: m.contactName, contactId: m.contactId, isUser: false, splitValue: 1 }))
      ]
    : [{ label: 'You', contactId: null, isUser: true, splitValue: 1 }]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialValues?.description ?? '',
      totalAmount: initialValues?.totalAmount
        ? String(initialValues.totalAmount / 1000)
        : '',
      date: initialValues?.date ?? startOfMinute(new Date()),
      paidBy: initialValues?.paidBy ?? 'user',
      splitType: initialValues?.splitType ?? 'EQUAL',
      categoryId: initialValues?.categoryId ?? null,
      notes: initialValues?.notes ?? '',
      shares: defaultShares,
      recordTransaction: false,
      accountId: null
    }
  });

  const { fields, replace, remove } = useFieldArray({ control: form.control, name: 'shares' });
  const splitType = form.watch('splitType');
  const totalAmount = parseFloat(form.watch('totalAmount') || '0');
  const paidBy = form.watch('paidBy');
  const recordTransaction = form.watch('recordTransaction');
  const userPaid = paidBy === 'user';

  // For standalone: seed first contact when contacts load (only once, only if just "You" in shares)
  useEffect(() => {
    if (isEditing) return; // don't reseed when editing
    if (groupMembers) return; // group mode manages its own seeding
    const currentShares = form.getValues('shares');
    if (currentShares.length === 1 && contacts.length > 0) {
      replace([
        { label: 'You', contactId: null, isUser: true, splitValue: splitType === 'EQUAL' ? 1 : 0 },
        { label: contacts[0].name, contactId: contacts[0].id, isUser: false, splitValue: splitType === 'EQUAL' ? 1 : 0 }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length]);

  // For group mode: re-seed when groupMembers arrive (sheet opens before query resolves)
  useEffect(() => {
    if (isEditing) return; // don't reseed when editing
    if (!groupMembers) return;
    replace([
      { label: 'You', contactId: null, isUser: true, splitValue: splitType === 'EQUAL' ? 1 : 0 },
      ...groupMembers.map(m => ({ label: m.contactName, contactId: m.contactId, isUser: false, splitValue: splitType === 'EQUAL' ? 1 : 0 }))
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupMembers?.length]);

  function handleSubmit(values: FormValues) {
    const totalMili = convertAmountToMiliUnits(parseFloat(values.totalAmount));
    const paidByUser = values.paidBy === 'user';
    const paidByContactId = paidByUser ? null : values.paidBy;

    onSubmit({
      description: values.description,
      totalAmount: totalMili,
      date: values.date,
      paidByUser,
      paidByContactId,
      splitType: values.splitType,
      categoryId: values.categoryId ?? null,
      notes: values.notes || null,
      shares: values.shares.map(s => ({
        contactId: s.contactId,
        isUser: s.isUser,
        splitValue: s.splitValue
      })),
      recordTransaction: values.recordTransaction,
      accountId: values.accountId
    });
  }

  const splitPlaceholder =
    splitType === 'EXACT' ? '0' :
    splitType === 'PERCENTAGE' ? '0%' :
    splitType === 'SHARES' ? '1' :
    '—';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payee</FormLabel>
              <FormControl>
                <Input placeholder='e.g. Dinner at Restaurant' disabled={disabled} {...field} />
              </FormControl>
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
          name='totalAmount'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total amount</FormLabel>
              <FormControl>
                <AmountInput {...field} placeholder='0.00' disabled={disabled} currency={DEFAULT_CURRENCY} allowNegativeValue={false} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='paidBy'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paid by</FormLabel>
              <FormControl>
                <ResponsiveSelect
                  value={field.value}
                  options={[{ label: 'You', value: 'user' }, ...availableContacts.map(c => ({ label: c.name, value: c.id }))]}
                  placeholder='Select who paid'
                  disabled={disabled}
                  onChangeAction={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Split type selector */}
        <FormField
          control={form.control}
          name='splitType'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Split type</FormLabel>
              <FormControl>
                <div className='flex gap-1.5'>
                  {SPLIT_TYPES.map(t => (
                    <button
                      key={t.value}
                      type='button'
                      disabled={disabled}
                      onClick={() => field.onChange(t.value)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        field.value === t.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input hover:bg-muted'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Shares */}
        <div className='space-y-2'>
          <p className='text-sm font-medium'>Participants</p>
          {fields.map((field, index) => (
            <div key={field.id} className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground flex-1 truncate'>{field.label}</span>
              {splitType !== 'EQUAL' ? (
                <FormField
                  control={form.control}
                  name={`shares.${index}.splitValue`}
                  render={({ field: f }) => (
                    <FormItem className='m-0'>
                      <FormControl>
                        <Input
                          type='number'
                          min='0'
                          step={splitType === 'EXACT' ? '0.01' : '1'}
                          placeholder={splitPlaceholder}
                          className='w-24 h-8 text-sm'
                          disabled={disabled}
                          value={f.value}
                          onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <span className='text-xs text-muted-foreground w-24 text-right'>
                  {fields.length > 0 && totalAmount > 0
                    ? `${(totalAmount / fields.length).toFixed(2)}`
                    : '—'}
                </span>
              )}
              <button
                type='button'
                disabled={disabled || fields.length <= 2}
                onClick={() => remove(index)}
                className='h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed'
                title='Remove participant'
              >
                <span className='text-base leading-none'>−</span>
              </button>
            </div>
          ))}

          {/* Add participant */}
          <div className='pt-1'>
            <select
              className='flex h-8 w-full rounded-md border border-dashed border-input bg-transparent px-3 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'
              disabled={disabled}
              value=''
              onChange={e => {
                const contactId = e.target.value;
                if (!contactId) return;
                const contact = availableContacts.find(c => c.id === contactId);
                if (!contact) return;
                if (fields.some(f => f.contactId === contactId)) return;
                replace([
                  ...fields.map(f => ({ label: f.label, contactId: f.contactId, isUser: f.isUser, splitValue: f.splitValue })),
                  { label: contact.name, contactId: contact.id, isUser: false, splitValue: splitType === 'EQUAL' ? 1 : 0 }
                ]);
              }}
            >
              <option value=''>+ Add participant</option>
              {availableContacts
                .filter(c => !fields.some(f => f.contactId === c.id))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
        </div>

        <FormField
          control={form.control}
          name='notes'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder='Any notes...' disabled={disabled} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Record as transaction toggle — only shown when user has accounts and not editing */}
        {!isEditing && accountOptions.length > 0 && (
          <FormField
            control={form.control}
            name='recordTransaction'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between rounded-md border px-3 py-2'>
                  <div>
                    <p className='text-sm font-medium'>Record as transaction</p>
                    <p className='text-xs text-muted-foreground'>Track your share in your account ledger</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
        )}

        {!isEditing && recordTransaction && (
          <>
            {/* Disclaimer */}
            <div className='rounded-md border bg-muted/40 p-3 space-y-1 text-sm'>
              {userPaid ? (
                <>
                  <p className='font-medium'>2 transactions will be created:</p>
                  <p className='text-muted-foreground'>1. Expense — your share deducted from your selected account (counts as expense)</p>
                  <p className='text-muted-foreground'>2. Receivable — others&apos; shares tracked in your bill split account (they owe you)</p>
                </>
              ) : (
                <>
                  <p className='font-medium'>1 transaction will be created:</p>
                  <p className='text-muted-foreground'>Your share recorded on your bill split account (you owe the payer)</p>
                </>
              )}
            </div>

            {/* Account selector — only needed when user paid */}
            {userPaid && (
              <FormField
                control={form.control}
                name='accountId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account you paid from</FormLabel>
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

            {/* Category — optional, only shown when user has categories */}
            {categoryOptions.length > 0 && (
              <FormField
                control={form.control}
                name='categoryId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <ResponsiveSelect
                        value={field.value ?? ''}
                        options={categoryOptions}
                        placeholder='Select category'
                        disabled={disabled}
                        allowCreatingOptions
                        onCreate={name => categoryMutation.mutate({ name })}
                        onChangeAction={val => field.onChange(val || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <Button type='submit' disabled={disabled} className='w-full'>
          {submitLabel ?? 'Add expense'}
        </Button>
      </form>
    </Form>
  );
}
