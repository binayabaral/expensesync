'use client';

import { use } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { FaArrowLeft, FaBoxOpen, FaUserPlus } from 'react-icons/fa6';
import { FaPencilAlt, FaTrash, FaArchive } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/hooks/useConfirm';
import { formatCurrency } from '@/lib/utils';
import { useGetGroup } from '@/features/bill-split/api/useGetGroup';
import { useGetGroupBalances } from '@/features/bill-split/api/useGetGroupBalances';
import { useGetGroupExpenses } from '@/features/bill-split/api/useGetGroupExpenses';
import { useGetSettlements } from '@/features/bill-split/api/useGetSettlements';
import { useEditGroup } from '@/features/bill-split/api/useEditGroup';
import { useDeleteGroup } from '@/features/bill-split/api/useDeleteGroup';
import { useDeleteSettlement } from '@/features/bill-split/api/useDeleteSettlement';
import { useOpenAddExpenseSheet } from '@/features/bill-split/hooks/useOpenAddExpenseSheet';
import { useOpenEditGroupSheet } from '@/features/bill-split/hooks/useOpenEditGroupSheet';
import { useOpenAddSettlementSheet } from '@/features/bill-split/hooks/useOpenAddSettlementSheet';
import { useOpenEditSettlementSheet } from '@/features/bill-split/hooks/useOpenEditSettlementSheet';
import { useOpenAddMemberSheet } from '@/features/bill-split/hooks/useOpenAddMemberSheet';
import { ExpenseRow } from '@/features/bill-split/components/ExpenseRow';

type Props = {
  params: Promise<{ groupId: string }>;
};

type Settlement = {
  id: string;
  amount: number;
  currency: string;
  date: string | Date;
  createdByUserId: string;
  creatorName: string | null;
  fromIsUser: boolean;
  toIsUser: boolean;
  fromContactId: string | null;
  toContactId: string | null;
  fromContactName: string | null;
  toContactName: string | null;
  notes: string | null;
  transactionId: string | null;
  transferId: string | null;
  settleGroupsBatchId: string | null;
  transferAccountId?: string | null;
  groupId: string | null;
};

function SettlementRow({
  settlement,
  currentUserId,
  onEdit
}: {
  settlement: Settlement;
  currentUserId: string | null | undefined;
  onEdit: () => void;
}) {
  const isOwn = settlement.createdByUserId === currentUserId;
  const isBatchSettle = !!settlement.settleGroupsBatchId;
  const { mutate: deleteSettlement, isPending: isDeleting } = useDeleteSettlement(settlement.id);
  const [ConfirmDialog, confirm] = useConfirm(
    isBatchSettle ? 'Delete group settle' : 'Delete settlement',
    isBatchSettle
      ? 'All settlements in this batch will be removed across all groups.'
      : 'Any linked transfer will also be removed.'
  );

  // Direction: "payer → recipient" (fromIsUser is from the creator's perspective)
  let direction: string;
  if (isOwn) {
    direction = settlement.fromIsUser
      ? `You → ${settlement.toContactName ?? 'Contact'}`
      : `${settlement.fromContactName ?? 'Contact'} → You`;
  } else {
    direction = settlement.fromIsUser
      ? `${settlement.creatorName ?? 'Member'} → ${settlement.toContactName ?? 'Contact'}`
      : `${settlement.fromContactName ?? 'Contact'} → ${settlement.creatorName ?? 'Member'}`;
  }

  const hasRecord = !!(settlement.transferId || settlement.transactionId);

  return (
    <>
      <ConfirmDialog />
      <div className='py-2.5 border-b last:border-b-0'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <div className='flex items-baseline gap-1.5'>
              <span className='text-sm font-medium'>{isBatchSettle ? 'Group settle' : 'Settlement'}</span>
              {settlement.notes && <span className='text-xs text-muted-foreground italic truncate hidden sm:inline'>{settlement.notes}</span>}
            </div>
            <p className='text-xs text-muted-foreground'>
              {format(new Date(settlement.date), 'MMM d, yyyy')} · {direction}
            </p>
          </div>
          <div className='flex items-center gap-1 shrink-0'>
            <span className='text-sm font-semibold'>{formatCurrency(settlement.amount)}</span>
            {hasRecord && (
              <Badge variant='secondary' className='text-xs'>Recorded</Badge>
            )}
            {isOwn && (
              <>
                {!isBatchSettle && (
                  <Button size='icon' variant='ghost' className='h-6 w-6' onClick={onEdit}>
                    <FaPencilAlt className='h-3 w-3' />
                  </Button>
                )}
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-6 w-6 text-destructive hover:text-destructive'
                  disabled={isDeleting}
                  onClick={async () => {
                    const ok = await confirm();
                    if (ok) deleteSettlement();
                  }}
                >
                  <FaTrash className='h-3 w-3' />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function GroupDetailPage({ params }: Props) {
  const { groupId } = use(params);
  const { userId } = useAuth();

  const groupQuery = useGetGroup(groupId);
  const balancesQuery = useGetGroupBalances(groupId);
  const expensesQuery = useGetGroupExpenses(groupId);
  const settlementsQuery = useGetSettlements(groupId);
  const { mutate: editGroup, isPending: isArchiving } = useEditGroup(groupId);
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteGroup(groupId);
  const { onOpen: openAddExpense } = useOpenAddExpenseSheet();
  const { onOpen: openEditGroup } = useOpenEditGroupSheet();
  const { onOpen: openSettlement } = useOpenAddSettlementSheet();
  const { onOpen: openEditSettlement } = useOpenEditSettlementSheet();
  const { onOpen: openAddMember } = useOpenAddMemberSheet();

  const group = groupQuery.data;
  const balances = balancesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];

  if (groupQuery.isLoading) {
    return (
      <div className='max-w-full space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-6 w-32' />
        <Skeleton className='h-64 w-full rounded-lg' />
      </div>
    );
  }

  if (!group) {
    return (
      <div className='max-w-full space-y-4'>
        <Link href='/bill-split' className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'>
          <FaArrowLeft className='h-3 w-3' />
          Back to Bill Split
        </Link>
        <p className='text-sm text-muted-foreground'>Group not found.</p>
      </div>
    );
  }

  const otherMembers = group.members
    .filter(m => !m.isCurrentUser)
    .map(m => {
      const balance = balances.find(b => b.contactId === m.contactId);
      return {
        contactId: m.contactId,
        contactName: m.displayName ?? m.contactName,
        netAmount: balance?.netAmount
      };
    });

  return (
    <div className='max-w-full space-y-4'>
      {/* Header */}
      <div className='space-y-3'>
        <Link href='/bill-split' className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit'>
          <FaArrowLeft className='h-3 w-3' />
          Bill Split
        </Link>

        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-xl font-bold truncate'>{group.name}</h1>
              <Badge variant='secondary'>{group.currency}</Badge>
              {group.isArchived && (
                <Badge variant='outline' className='text-muted-foreground'>
                  <FaArchive className='h-2.5 w-2.5 mr-1' />
                  Archived
                </Badge>
              )}
            </div>
            {group.description && (
              <p className='text-sm text-muted-foreground mt-1'>{group.description}</p>
            )}
          </div>

          <div className='flex items-center gap-1.5 shrink-0'>
            <Button
              size='icon'
              variant='ghost'
              className='h-8 w-8'
              onClick={() => openEditGroup(group.id)}
            >
              <FaPencilAlt className='h-3.5 w-3.5' />
            </Button>
            <Button
              size='icon'
              variant='ghost'
              className='h-8 w-8'
              disabled={isArchiving}
              onClick={() => editGroup({ isArchived: !group.isArchived })}
              title={group.isArchived ? 'Unarchive' : 'Archive'}
            >
              {group.isArchived ? (
                <FaBoxOpen className='h-3.5 w-3.5' />
              ) : (
                <FaArchive className='h-3.5 w-3.5' />
              )}
            </Button>
            {expenses.length === 0 && settlements.length === 0 && (
              <Button
                size='icon'
                variant='ghost'
                className='h-8 w-8 text-destructive hover:text-destructive'
                disabled={isDeleting}
                onClick={() => {
                  if (confirm(`Delete "${group.name}"?`)) {
                    deleteGroup();
                  }
                }}
              >
                <FaTrash className='h-3.5 w-3.5' />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Members */}
      <div className='border rounded-md px-3 py-2'>
        <div className='flex items-center justify-between gap-2 mb-1.5'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Members</p>
          <Button
            size='sm'
            variant='ghost'
            className='h-6 px-2 text-xs text-muted-foreground'
            onClick={() => openAddMember(group.id, group.members.map(m => m.contactId))}
          >
            <FaUserPlus className='h-3 w-3 mr-1' />
            Add
          </Button>
        </div>
        <div className='flex flex-wrap gap-2'>
          {group.members.map(member => {
            const balance = balances.find(b => b.contactId === member.contactId);
            return (
              <div key={member.id} className='flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1'>
                <span className={`text-sm ${member.isCurrentUser ? 'font-medium' : ''}`}>
                  {member.isCurrentUser ? 'You' : (member.displayName ?? member.contactName)}
                </span>
                {!member.userId && (
                  <Badge variant='outline' className='text-xs text-muted-foreground'>pending</Badge>
                )}
                {!member.isCurrentUser && balance && balance.netAmount !== 0 && (
                  <span className={`text-xs font-medium ${balance.netAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    {balance.netAmount > 0
                      ? `owes you ${formatCurrency(balance.netAmount)}`
                      : `you owe ${formatCurrency(Math.abs(balance.netAmount))}`}
                  </span>
                )}
                {!member.isCurrentUser && balance && balance.netAmount === 0 && balancesQuery.isFetched && (
                  <span className='text-xs text-muted-foreground'>settled</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses + Settlements side by side */}
      <div className='grid grid-cols-[1fr_320px] gap-4 items-start'>
        {/* Expenses */}
        <div className='border rounded-md px-3 py-2'>
          <div className='flex items-center justify-between mb-1.5'>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Expenses</p>
            <Button size='sm' onClick={() => openAddExpense(groupId)}>Add expense</Button>
          </div>
          {expensesQuery.isLoading ? (
            <div className='space-y-2'>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className='h-14 rounded' />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <p className='text-sm text-muted-foreground py-1'>No expenses yet.</p>
          ) : (
            <div>
              {expenses.map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  contextName={group.name}
                  isCreator={expense.createdByUserId === userId}
                  groupId={groupId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Settlements */}
        <div className='border rounded-md px-3 py-2'>
          <div className='flex items-center justify-between mb-1.5'>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Settlements</p>
            <Button
              size='sm'
              variant='outline'
              onClick={() => openSettlement({
                groupId,
                groupName: group.name,
                groupMembers: otherMembers
              })}
            >
              Record
            </Button>
          </div>
          {settlementsQuery.isLoading ? (
            <div className='space-y-2'>
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className='h-10 rounded' />
              ))}
            </div>
          ) : settlements.length === 0 ? (
            <p className='text-sm text-muted-foreground py-1'>No settlements yet.</p>
          ) : (
            <div>
              {settlements.map(settlement => (
                <SettlementRow
                  key={settlement.id}
                  settlement={settlement}
                  currentUserId={userId}
                  onEdit={() => {
                    const contactId = settlement.fromIsUser ? settlement.toContactId : settlement.fromContactId;
                    const contactMember = otherMembers.find(m => m.contactId === contactId);
                    openEditSettlement({
                      id: settlement.id,
                      contactId: contactId ?? undefined,
                      contactName: contactMember?.contactName,
                      direction: settlement.fromIsUser ? 'paying' : 'receiving',
                      groupId,
                      groupName: group.name,
                      groupMembers: otherMembers,
                      amount: settlement.amount,
                      date: new Date(settlement.date),
                      notes: settlement.notes,
                      initialAccountId: settlement.transferAccountId ?? null
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
