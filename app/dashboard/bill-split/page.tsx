'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { FaUsers, FaArchive, FaChevronRight, FaCircle } from 'react-icons/fa';
import { FaUserPlus, FaPlus } from 'react-icons/fa6';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useAuth, useUser } from '@clerk/nextjs';
import { EnrollmentGate } from '@/features/bill-split/components/EnrollmentGate';
import { ExpenseRow } from '@/features/bill-split/components/ExpenseRow';
import { ActivityFeed } from '@/features/bill-split/components/ActivityFeed';
import { useGetGroups } from '@/features/bill-split/api/useGetGroups';
import { useGetBalances } from '@/features/bill-split/api/useGetBalances';
import { useGetStandaloneExpenses } from '@/features/bill-split/api/useGetStandaloneExpenses';
import { useGetAllExpenses } from '@/features/bill-split/api/useGetAllExpenses';
import { useGetSettlements } from '@/features/bill-split/api/useGetSettlements';
import { useOpenAddGroupSheet } from '@/features/bill-split/hooks/useOpenAddGroupSheet';
import { useOpenAddExpenseSheet } from '@/features/bill-split/hooks/useOpenAddExpenseSheet';
import { useOpenAddContactSheet } from '@/features/bill-split/hooks/useOpenAddContactSheet';
import { useOpenAddSettlementSheet } from '@/features/bill-split/hooks/useOpenAddSettlementSheet';


function BillSplitContent() {
  const [showArchived, setShowArchived] = useState(false);
  const { userId } = useAuth();
  const { user } = useUser();

  const groupsQuery = useGetGroups();
  const balancesQuery = useGetBalances();
  const expensesQuery = useGetStandaloneExpenses();
  const allExpensesQuery = useGetAllExpenses();
  const settlementsQuery = useGetSettlements();

  const { onOpen: openAddGroup } = useOpenAddGroupSheet();
  const { onOpen: openAddExpense } = useOpenAddExpenseSheet();
  const { onOpen: openAddContact } = useOpenAddContactSheet();
  const { onOpen: openSettlement } = useOpenAddSettlementSheet();

  const groups = groupsQuery.data ?? [];
  const balances = balancesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const allExpenses = allExpensesQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];

  const visibleGroups = showArchived ? groups : groups.filter(g => !g.isArchived);

  const totalOwe = balances.filter(b => b.netAmount < 0).reduce((s, b) => s + Math.abs(b.netAmount), 0);
  const totalOwed = balances.filter(b => b.netAmount > 0).reduce((s, b) => s + b.netAmount, 0);

  return (
    <div className='h-full overflow-y-auto space-y-5'>
      {/* Page header */}
      <h1 className='text-xl font-bold'>Bill Split</h1>

      {/* Summary strip */}
      {!balancesQuery.isLoading && (totalOwe > 0 || totalOwed > 0) && (
        <div className='grid grid-cols-2 gap-3'>
          <div className='border rounded-md px-4 py-3'>
            <p className='text-xs text-muted-foreground mb-0.5'>You owe</p>
            <p className='text-lg font-bold text-rose-600 dark:text-rose-400'>{formatCurrency(totalOwe)}</p>
          </div>
          <div className='border rounded-md px-4 py-3'>
            <p className='text-xs text-muted-foreground mb-0.5'>You&apos;re owed</p>
            <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>{formatCurrency(totalOwed)}</p>
          </div>
        </div>
      )}

      {/* People */}
      <div className='border rounded-md'>
        <div className='flex items-center justify-between px-3 py-2 border-b'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>People</p>
          <div className='flex items-center gap-3'>
            <Button size='sm' variant='outline' onClick={() => openAddContact()}>
              <FaUserPlus className='h-3 w-3 mr-1.5' />
              Add contact
            </Button>
          </div>
        </div>

        {balancesQuery.isLoading ? (
          <div className='p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2'>
            {[...Array(4)].map((_, i) => <Skeleton key={i} className='h-28 rounded-md' />)}
          </div>
        ) : balances.length === 0 ? (
          <div className='px-3 py-4 flex flex-col items-center gap-2'>
            <p className='text-sm text-muted-foreground text-center'>Add people to track what you owe each other.</p>
            <Button size='sm' variant='outline' onClick={() => openAddContact()}>
              <FaUserPlus className='h-3 w-3 mr-1.5' />
              Add contact
            </Button>
          </div>
        ) : (
          <div className='p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2'>
            {balances.map(contact => {
              const isOwedToYou = contact.netAmount > 0;
              const isSettled = contact.netAmount === 0;
              return (
                <div key={contact.key} className='border rounded-md p-2.5 flex flex-col gap-2'>
                  <div className='flex items-center justify-between gap-1'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <div className='h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0'>
                        <span className='text-[10px] font-semibold text-muted-foreground uppercase'>
                          {contact.name.trim().split(' ').length >= 2
                            ? contact.name.trim().split(' ')[0][0] + contact.name.trim().split(' ').at(-1)![0]
                            : contact.name.slice(0, 2)}
                        </span>
                      </div>
                      <p className='text-xs font-medium truncate'>{contact.name}</p>
                    </div>
                    {contact.linkedUserId
                      ? <FaCircle className='h-1.5 w-1.5 text-emerald-500 shrink-0' />
                      : <FaCircle className='h-1.5 w-1.5 text-muted-foreground/40 shrink-0' />
                    }
                  </div>
                  {isSettled ? (
                    <p className='text-xs text-muted-foreground'>Settled</p>
                  ) : (
                    <div className='flex items-center justify-between gap-1'>
                      <div>
                        <p className={`text-sm font-bold leading-tight ${isOwedToYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isOwedToYou ? '+' : '-'}{formatCurrency(Math.abs(contact.netAmount))}
                        </p>
                        <p className='text-xs text-muted-foreground leading-tight'>{isOwedToYou ? 'owes you' : 'you owe'}</p>
                      </div>
                      {contact.contactId && (
                        <button
                          className='text-xs text-muted-foreground hover:text-foreground border rounded px-1.5 py-0.5 shrink-0 transition-colors'
                          onClick={() => openSettlement({
                            contactId: contact.contactId!,
                            contactName: contact.name,
                            direction: isOwedToYou ? 'receiving' : 'paying'
                          })}
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Groups + Standalone + Activity */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-5 items-start'>

      {/* Groups */}
      <div className='border rounded-md'>
        <div className='flex items-center justify-between px-3 py-2 border-b'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Groups</p>
          <div className='flex items-center gap-3'>
            {groups.some(g => g.isArchived) && (
              <button
                className='text-xs text-muted-foreground hover:text-foreground transition-colors'
                onClick={() => setShowArchived(v => !v)}
              >
                {showArchived ? 'Hide archived' : `+${groups.filter(g => g.isArchived).length} archived`}
              </button>
            )}
            <Button size='sm' variant='outline' onClick={() => openAddGroup()}>
              <FaPlus className='h-3 w-3 mr-1.5' />
              New group
            </Button>
          </div>
        </div>

        {groupsQuery.isLoading ? (
          <div className='px-3 py-2 space-y-2'>
            {[...Array(3)].map((_, i) => <Skeleton key={i} className='h-10 rounded' />)}
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className='px-3 py-4 flex flex-col items-center gap-2'>
            <p className='text-sm text-muted-foreground text-center'>
              {groups.length === 0
                ? 'Create a group to split expenses with multiple people.'
                : 'No active groups.'}
            </p>
            {groups.length === 0 && (
              <Button size='sm' variant='outline' onClick={() => openAddGroup()}>
                <FaPlus className='h-3 w-3 mr-1.5' />
                New group
              </Button>
            )}
          </div>
        ) : (
          <div>
            {visibleGroups.map(group => (
              <Link key={group.id} href={`/dashboard/bill-split/${group.id}`}>
                <div className='flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer'>
                  <div className='h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0'>
                    <FaUsers className='h-3.5 w-3.5 text-muted-foreground' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-sm font-medium truncate'>{group.name}</span>
                      <Badge variant='secondary' className='text-xs shrink-0'>{group.currency}</Badge>
                      {group.isArchived && (
                        <Badge variant='outline' className='text-xs shrink-0 text-muted-foreground'>
                          <FaArchive className='h-2.5 w-2.5 mr-1' />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <p className='text-xs text-muted-foreground truncate'>
                      {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                      {group.members.length > 0 && ` · ${group.members.map(m => m.contactName).join(', ')}`}
                    </p>
                  </div>
                  <FaChevronRight className='h-3 w-3 text-muted-foreground shrink-0' />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Standalone expenses */}
      <div className='border rounded-md'>
        <div className='flex items-center justify-between px-3 py-2 border-b'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Standalone Expenses</p>
          <Button size='sm' variant='outline' onClick={() => openAddExpense(null)}>Add expense</Button>
        </div>

        {expensesQuery.isLoading ? (
          <div className='px-3 py-2 space-y-2'>
            {[...Array(3)].map((_, i) => <Skeleton key={i} className='h-14 rounded' />)}
          </div>
        ) : expenses.length === 0 ? (
          <p className='px-3 py-4 text-sm text-muted-foreground text-center'>No standalone expenses yet.</p>
        ) : (
          <div className='px-3'>
            {expenses.map(expense => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                contextName={expense.description}
                isCreator={true}
                currentUserName={user?.fullName ?? ''}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activity feed */}
      <ActivityFeed
        expenses={allExpenses}
        settlements={settlements}
        groups={groups}
        currentUserId={userId}
        isLoading={allExpensesQuery.isLoading || settlementsQuery.isLoading}
      />

      </div> {/* end groups + standalone + activity grid */}
    </div>
  );
}

export default function BillSplitPage() {
  return (
    <Suspense>
      <EnrollmentGate>
        <BillSplitContent />
      </EnrollmentGate>
    </Suspense>
  );
}
