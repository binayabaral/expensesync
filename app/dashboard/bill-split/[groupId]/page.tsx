'use client';

import { use } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { FaArrowLeft, FaBoxOpen, FaUserPlus, FaCircleCheck, FaArrowRightLong } from 'react-icons/fa6';
import { FaPencilAlt, FaTrash, FaArchive } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/useConfirm';
import { formatCurrency, toTitleCase } from '@/lib/utils';
import { useGetGroup } from '@/features/bill-split/api/useGetGroup';
import { useGetGroupBalances } from '@/features/bill-split/api/useGetGroupBalances';
import { useGetGroupMemberDebts } from '@/features/bill-split/api/useGetGroupMemberDebts';
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
  currentUserName,
  onEdit
}: {
  settlement: Settlement;
  currentUserId: string | null | undefined;
  currentUserName: string;
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

  // Direction strings — web shows "You", print shows real name
  let directionWeb: string;
  let directionPrint: string;
  if (isOwn) {
    directionWeb = settlement.fromIsUser
      ? `You → ${toTitleCase(settlement.toContactName) || 'Contact'}`
      : `${toTitleCase(settlement.fromContactName) || 'Contact'} → You`;
    directionPrint = settlement.fromIsUser
      ? `${currentUserName} → ${toTitleCase(settlement.toContactName) || 'Contact'}`
      : `${toTitleCase(settlement.fromContactName) || 'Contact'} → ${currentUserName}`;
  } else {
    directionWeb = settlement.fromIsUser
      ? `${toTitleCase(settlement.creatorName) || 'Member'} → ${toTitleCase(settlement.toContactName) || 'Contact'}`
      : `${toTitleCase(settlement.fromContactName) || 'Contact'} → ${toTitleCase(settlement.creatorName) || 'Member'}`;
    directionPrint = directionWeb;
  }

  const hasRecord = !!(settlement.transferId || settlement.transactionId);

  return (
    <>
      <ConfirmDialog />
      <div className='py-2.5 border-b last:border-b-0 print-no-break print:border-gray-200'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <div className='flex items-baseline gap-1.5'>
              <span className='text-sm font-medium'>{isBatchSettle ? 'Group settle' : 'Settlement'}</span>
              {settlement.notes && <span className='text-xs text-muted-foreground italic truncate hidden sm:inline print:inline'>{settlement.notes}</span>}
            </div>
            <p className='text-xs text-muted-foreground'>
              {format(new Date(settlement.date), 'MMM d, yyyy')} · <span className='print:hidden'>{directionWeb}</span><span className='hidden print:inline'>{directionPrint}</span>
            </p>
          </div>
          <div className='flex items-center gap-1 shrink-0'>
            <span className='text-sm font-semibold'>{formatCurrency(settlement.amount)}</span>
            {hasRecord && (
              <Badge variant='secondary' className='print:hidden text-xs'>Recorded</Badge>
            )}
            {isOwn && (
              <>
                {!isBatchSettle && (
                  <Button size='icon' variant='ghost' className='print:hidden h-6 w-6' onClick={onEdit}>
                    <FaPencilAlt className='h-3 w-3' />
                  </Button>
                )}
                <Button
                  size='icon'
                  variant='ghost'
                  className='print:hidden h-6 w-6 text-destructive hover:text-destructive'
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
  const memberDebtsQuery = useGetGroupMemberDebts(groupId);
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
  const memberDebts = memberDebtsQuery.data ?? [];
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
        <Link href='/dashboard/bill-split' className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground'>
          <FaArrowLeft className='h-3 w-3' />
          Back to Bill Split
        </Link>
        <p className='text-sm text-muted-foreground'>Group not found.</p>
      </div>
    );
  }

  const currentUserName = toTitleCase(group.members.find(m => m.isCurrentUser)?.displayName ?? group.members.find(m => m.isCurrentUser)?.contactName ?? '');

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
    <div className='h-full overflow-y-auto space-y-4 print:h-auto print:overflow-visible'>
      {/* Print-only document header */}
      <div className='hidden print:block mb-6 pb-4 border-b-2 border-gray-200'>
        <div className='flex items-start justify-between'>
          <div>
            <p className='text-xs text-gray-400 uppercase tracking-widest mb-1'>ExpenseSync · Bill Split</p>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold text-gray-900'>{group.name}</h1>
              <span className='text-xs font-medium bg-gray-100 text-gray-600 rounded px-2 py-0.5'>{group.currency}</span>
              {group.isArchived && (
                <span className='text-xs font-medium bg-gray-100 text-gray-500 rounded px-2 py-0.5'>Archived</span>
              )}
            </div>
            {group.description && (
              <p className='text-sm text-gray-500 mt-0.5'>{group.description}</p>
            )}
          </div>
          <div className='text-right'>
            <p className='text-xs text-gray-400'>Generated</p>
            <p className='text-xs text-gray-600 font-medium'>{format(new Date(), 'MMM d, yyyy · h:mm a')}</p>
            <p className='text-xs text-gray-400 mt-1'>{expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {settlements.length} settlement{settlements.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Header (screen only) */}
      <div className='space-y-3 print:hidden'>
        <Link href='/dashboard/bill-split' className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit'>
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
      <div className='border rounded-md px-3 py-2 print:border-gray-200'>
        <div className='border-b pb-1.5 mb-2'>
          <div className='flex items-center justify-between gap-2 min-h-6'>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Members</p>
            <Button
              size='sm'
              variant='ghost'
              className='print:hidden h-6 px-2 text-xs text-muted-foreground'
              onClick={() => openAddMember(group.id, group.members.map(m => m.contactId))}
            >
              <FaUserPlus className='h-3 w-3 mr-1' />
              Add
            </Button>
          </div>
          <p className='text-xs text-muted-foreground/60 pb-0.5 print:hidden'>Everyone in this group and what they owe you.</p>
          <p className='text-xs text-muted-foreground/60 pb-0.5 hidden print:block'>Everyone in this group.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {group.members.map(member => {
            const balance = balances.find(b => b.contactId === member.contactId);
            return (
              <div key={member.id} className='flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1'>
                <span className='text-sm'>
                  {member.isCurrentUser ? (
                    <>
                      <span className='print:hidden'>You</span>
                      <span className='hidden print:inline'>{toTitleCase(member.displayName ?? member.contactName)}</span>
                    </>
                  ) : toTitleCase(member.displayName ?? member.contactName)}
                </span>
                {!member.userId && (
                  <Badge variant='outline' className='print:hidden text-xs text-muted-foreground'>pending</Badge>
                )}
                {!member.isCurrentUser && balance && balance.netAmount !== 0 && (
                  <span className={`print:hidden inline-flex items-center text-xs font-medium ${balance.netAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    {balance.netAmount > 0
                      ? `owes you ${formatCurrency(balance.netAmount)}`
                      : `you owe ${formatCurrency(Math.abs(balance.netAmount))}`}
                  </span>
                )}
                {!member.isCurrentUser && balance && balance.netAmount === 0 && balancesQuery.isFetched && (
                  <span className='print:hidden text-xs text-muted-foreground'>settled</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses (left) + Settle up & Settlements (right) */}
      <div className='grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 items-start print:grid-cols-1'>
        {/* Left: Expenses — last on mobile/print, first on desktop */}
        <div className='border rounded-md px-3 py-2 order-3 md:order-1 print:order-3 print:border-gray-200'>
          <div className='border-b pb-1.5 mb-2'>
            <div className='flex items-center justify-between min-h-6'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Expenses</p>
              <Button size='sm' className='print:hidden' onClick={() => openAddExpense(groupId)}>Add expense</Button>
            </div>
            <p className='text-xs text-muted-foreground/60 pb-0.5'>All shared costs added to this group.</p>
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
                  currentUserName={currentUserName}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Settle up + Settlements stacked */}
        <div className='order-1 md:order-2 flex flex-col gap-4'>
          {/* Settle up */}
          <div className='border rounded-md px-3 py-2 print:border-gray-200'>
            <div className='border-b pb-1.5 mb-2'>
              <div className='flex items-center min-h-6'>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Settle up</p>
              </div>
              <p className='text-xs text-muted-foreground/60 pb-0.5'>Who pays whom to settle all debts in as few transactions as possible.</p>
            </div>
            {memberDebtsQuery.isLoading ? (
              <div className='space-y-1'>
                {[...Array(2)].map((_, i) => <Skeleton key={i} className='h-6 w-full rounded' />)}
              </div>
            ) : memberDebts.length === 0 ? (
              <div className='flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400'>
                <FaCircleCheck className='h-3.5 w-3.5 shrink-0' />
                <span>Everyone is settled up</span>
              </div>
            ) : (
              <div className='space-y-px'>
                {memberDebts.map((debt, i) => (
                  <div key={i} className='flex items-center gap-2 py-1 text-sm min-w-0'>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className='font-medium truncate min-w-0'>
                            {debt.fromIsCurrentUser ? (
                              <>
                                <span className='print:hidden'>You</span>
                                <span className='hidden print:inline'>{toTitleCase(debt.fromName)}</span>
                              </>
                            ) : toTitleCase(debt.fromName)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>{debt.fromIsCurrentUser ? 'You' : toTitleCase(debt.fromName)}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <FaArrowRightLong className='h-2.5 w-2.5 text-muted-foreground/50 shrink-0' />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className='font-medium truncate min-w-0'>
                            {debt.toIsCurrentUser ? (
                              <>
                                <span className='print:hidden'>You</span>
                                <span className='hidden print:inline'>{toTitleCase(debt.toName)}</span>
                              </>
                            ) : toTitleCase(debt.toName)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>{debt.toIsCurrentUser ? 'You' : toTitleCase(debt.toName)}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className='ml-auto font-semibold tabular-nums shrink-0'>
                      {formatCurrency(debt.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settlements */}
          <div className={`border rounded-md px-3 py-2 print:border-gray-200${settlements.length === 0 ? ' print:hidden' : ''}`}>
            <div className='border-b pb-1.5 mb-2'>
              <div className='flex items-center justify-between min-h-6'>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Settlements</p>
                <Button
                  size='sm'
                  variant='outline'
                  className='print:hidden'
                  onClick={() => openSettlement({
                    groupId,
                    groupName: group.name,
                    groupMembers: otherMembers
                  })}
                >
                  Record
                </Button>
              </div>
              <p className='text-xs text-muted-foreground/60 pb-0.5'>Payments recorded to settle debts in this group.</p>
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
                    currentUserName={currentUserName}
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
    </div>
  );
}
