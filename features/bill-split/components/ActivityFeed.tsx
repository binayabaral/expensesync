'use client';

import { format } from 'date-fns';
import { FaReceipt, FaHandshake } from 'react-icons/fa6';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

type Expense = {
  id: string;
  description: string;
  totalAmount: number;
  date: string | Date;
  groupId: string | null;
  paidByMe: boolean;
  paidByUser: boolean;
  createdByUserId: string;
  shares: { isMine: boolean; shareAmount: number; transactionId: string | null }[];
};

type Settlement = {
  id: string;
  amount: number;
  currency: string;
  date: string | Date;
  groupId: string | null;
  fromIsUser: boolean;
  toIsUser: boolean;
  fromContactName: string | null;
  toContactName: string | null;
  createdByUserId: string;
  creatorName: string | null;
  settleGroupsBatchId: string | null;
  transactionId: string | null;
  transferId: string | null;
};

type Group = { id: string; name: string };

type Props = {
  expenses: Expense[];
  settlements: Settlement[];
  groups: Group[];
  currentUserId: string | null | undefined;
  isLoading: boolean;
};

type ActivityItem =
  | { type: 'expense'; date: Date; data: Expense }
  | { type: 'settlement'; date: Date; data: Settlement };

export function ActivityFeed({ expenses, settlements, groups, currentUserId, isLoading }: Props) {
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  const items: ActivityItem[] = [
    ...expenses.map(e => ({ type: 'expense' as const, date: new Date(e.date), data: e })),
    ...settlements.map(s => ({ type: 'settlement' as const, date: new Date(s.date), data: s }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className='border rounded-md'>
      <div className='flex items-center justify-between px-3 py-2 border-b'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Activity</p>
      </div>

      {isLoading ? (
        <div className='px-3 py-2 space-y-2'>
          {[...Array(5)].map((_, i) => <Skeleton key={i} className='h-10 rounded' />)}
        </div>
      ) : items.length === 0 ? (
        <p className='px-3 py-4 text-sm text-muted-foreground text-center'>No activity yet.</p>
      ) : (
        <div className='divide-y max-h-[480px] overflow-y-auto'>
          {items.map(item => {
            if (item.type === 'expense') {
              const e = item.data;
              const groupName = e.groupId ? (groupMap.get(e.groupId) ?? 'Group') : null;
              const myShare = e.shares.find(s => s.isMine);
              const isCreator = e.createdByUserId === currentUserId;
              const paidByLabel = e.paidByMe ? 'You paid' : e.paidByUser && !isCreator ? 'Creator paid' : 'Contact paid';

              return (
                <div key={`e-${e.id}`} className='px-3 py-2.5 flex items-start gap-2.5'>
                  <div className='h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5'>
                    <FaReceipt className='h-2.5 w-2.5 text-muted-foreground' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-baseline justify-between gap-1'>
                      <span className='text-sm font-medium truncate'>{e.description}</span>
                      <span className='text-sm font-semibold shrink-0'>{formatCurrency(e.totalAmount)}</span>
                    </div>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <span className='text-xs text-muted-foreground'>{format(item.date, 'MMM d, yyyy')} · {paidByLabel}</span>
                      {groupName
                        ? <Badge variant='secondary' className='text-xs'>{groupName}</Badge>
                        : <Badge variant='outline' className='text-xs'>Standalone</Badge>
                      }
                      {myShare && (
                        <span className='text-xs text-muted-foreground'>
                          Your share: {formatCurrency(myShare.shareAmount)}
                          {myShare.transactionId && <span className='ml-1 text-emerald-600 dark:text-emerald-400'>✓</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Settlement
            const s = item.data;
            const groupName = s.groupId ? (groupMap.get(s.groupId) ?? 'Group') : null;
            const isOwn = s.createdByUserId === currentUserId;
            let direction: string;
            if (isOwn) {
              direction = s.fromIsUser
                ? `You → ${s.toContactName ?? 'Contact'}`
                : `${s.fromContactName ?? 'Contact'} → You`;
            } else {
              direction = s.fromIsUser
                ? `${s.creatorName ?? 'Member'} → ${s.toContactName ?? 'Contact'}`
                : `${s.fromContactName ?? 'Contact'} → ${s.creatorName ?? 'Member'}`;
            }
            const hasRecord = !!(s.transferId || s.transactionId);

            return (
              <div key={`s-${s.id}`} className='px-3 py-2.5 flex items-start gap-2.5'>
                <div className='h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5'>
                  <FaHandshake className='h-2.5 w-2.5 text-muted-foreground' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-baseline justify-between gap-1'>
                    <span className='text-sm font-medium truncate'>
                      {s.settleGroupsBatchId ? 'Group settle' : 'Settlement'}
                    </span>
                    <span className='text-sm font-semibold shrink-0'>{formatCurrency(s.amount)}</span>
                  </div>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    <span className='text-xs text-muted-foreground'>{format(item.date, 'MMM d, yyyy')} · {direction}</span>
                    {groupName
                      ? <Badge variant='secondary' className='text-xs'>{groupName}</Badge>
                      : <Badge variant='outline' className='text-xs'>Standalone</Badge>
                    }
                    {hasRecord && <Badge variant='secondary' className='text-xs'>Recorded</Badge>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
