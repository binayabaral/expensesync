'use client';

import { format } from 'date-fns';
import { FaReceipt, FaTrash } from 'react-icons/fa6';
import { FaPencilAlt } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, toTitleCase } from '@/lib/utils';
import { useOpenRecordShareSheet } from '../hooks/useOpenRecordShareSheet';
import { useOpenEditExpenseSheet } from '../hooks/useOpenEditExpenseSheet';
import { useDeleteExpense } from '../api/useDeleteExpense';

type Share = {
  id: string;
  contactId: string | null;
  isUser: boolean;
  isMine: boolean;
  shareAmount: number;
  splitValue: number;
  transactionId: string | null;
  receivableTransactionId?: string | null;
  contactName: string | null;
  txDate?: string | Date | null;
  txCategoryId?: string | null;
  txNotes?: string | null;
};

type Props = {
  expense: {
    id: string;
    description: string;
    totalAmount: number;
    date: string | Date;
    paidByUser: boolean;
    paidByMe: boolean;
    paidByContactId: string | null;
    splitType: string;
    notes: string | null;
    categoryId: string | null;
    shares: Share[];
    createdByUserId: string;
  };
  contextName: string;
  isCreator: boolean;
  groupId?: string | null;
  currentUserName: string;
};

export function ExpenseRow({ expense, contextName, isCreator, groupId, currentUserName }: Props) {
  const { onOpen: openRecordShare } = useOpenRecordShareSheet();
  const { onOpen: openEditExpense } = useOpenEditExpenseSheet();
  const { mutate: deleteExpense, isPending: isDeleting } = useDeleteExpense(expense.id);

  const paidByLabelWeb = expense.paidByMe
    ? 'You paid'
    : expense.paidByUser
      ? `${toTitleCase(expense.shares.find(s => s.isUser)?.contactName) || 'Member'} paid`
      : `${toTitleCase(expense.shares.find(s => s.contactId === expense.paidByContactId)?.contactName) || 'Someone'} paid`;

  const paidByLabelPrint = expense.paidByMe
    ? `${currentUserName} paid`
    : paidByLabelWeb;

  return (
    <div className='py-2.5 border-b last:border-b-0 print-no-break print:border-gray-200'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-baseline gap-1.5 min-w-0'>
            <span className='text-sm font-medium truncate'>{expense.description}</span>
            {expense.notes && <span className='text-xs text-muted-foreground italic truncate hidden sm:inline print:inline'>{expense.notes}</span>}
          </div>
          <p className='text-xs text-muted-foreground'>
            {format(new Date(expense.date), 'MMM d, yyyy, h:mm a')} ·<span className='print:hidden'>{paidByLabelWeb}</span><span className='hidden print:inline'>{paidByLabelPrint}</span>
          </p>
        </div>
        <div className='flex items-center gap-1 shrink-0'>
          <span className='text-sm font-semibold'>{formatCurrency(expense.totalAmount)}</span>
          {isCreator && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size='icon'
                        variant='ghost'
                        className='print:hidden h-6 w-6'
                        disabled={expense.shares.some(s => s.transactionId)}
                        onClick={() => openEditExpense({
                          expenseId: expense.id,
                          groupId: groupId ?? null,
                          initialValues: {
                            description: expense.description,
                            totalAmount: expense.totalAmount,
                            date: new Date(expense.date),
                            paidBy: expense.paidByMe ? 'user' : (expense.paidByContactId ?? 'user'),
                            splitType: expense.splitType as 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES',
                            categoryId: expense.categoryId,
                            notes: expense.notes,
                            shares: expense.shares.map(s => ({
                              label: s.isMine ? 'You' : (s.contactName ?? 'Unknown'),
                              contactId: s.contactId,
                              isUser: s.isUser,
                              splitValue: s.splitValue
                            }))
                          }
                        })}
                      >
                        <FaPencilAlt className='h-2.5 w-2.5 text-muted-foreground' />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {expense.shares.some(s => s.transactionId) && (
                    <TooltipContent>
                      <p>Cannot edit after shares are recorded</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button size='icon' variant='ghost' className='print:hidden h-6 w-6 -mr-1' disabled={isDeleting} onClick={() => deleteExpense()}>
                <FaTrash className='h-3 w-3 text-muted-foreground' />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className='mt-1 flex flex-wrap gap-1'>
        {expense.shares.map(share => (
          <div
            key={share.id}
            className={`flex items-center gap-1 text-xs rounded px-1.5 py-0.5 ${share.isMine ? 'bg-primary/10 text-primary print:bg-muted/60 print:text-muted-foreground' : 'bg-muted/60 text-muted-foreground'}`}
          >
            <span className='font-medium'>
              {share.isMine ? (
                <>
                  <span className='print:hidden'>You</span>
                  <span className='hidden print:inline'>{currentUserName}</span>
                </>
              ) : toTitleCase(share.contactName) || 'Unknown'}
            </span>
            <span>{formatCurrency(share.shareAmount)}</span>
            {share.isMine && !share.transactionId && (
              <Badge
                variant='outline'
                className='print:hidden text-xs cursor-pointer hover:bg-muted ml-0.5'
                onClick={() =>
                  openRecordShare({
                    expenseId: expense.id,
                    shareId: share.id,
                    shareAmount: share.shareAmount,
                    totalAmount: expense.totalAmount,
                    paidByUser: expense.paidByMe,
                    contextName,
                    categoryId: expense.categoryId
                  })
                }
              >
                Record
              </Badge>
            )}
            {share.isMine && share.transactionId && (
              <>
                <Button
                  size='icon'
                  variant='ghost'
                  className='print:hidden h-4 w-4 ml-0.5'
                  title='Edit recording'
                  onClick={() =>
                    openRecordShare({
                      expenseId: expense.id,
                      shareId: share.id,
                      shareAmount: share.shareAmount,
                      totalAmount: expense.totalAmount,
                      paidByUser: expense.paidByMe,
                      contextName,
                      categoryId: share.txCategoryId ?? expense.categoryId,
                      transactionId: share.transactionId,
                      receivableTransactionId: share.receivableTransactionId,
                      initialDate: share.txDate ? new Date(share.txDate) : undefined,
                      initialNotes: share.txNotes ?? null
                    })
                  }
                >
                  <FaPencilAlt className='h-2 w-2' />
                </Button>
                <Badge variant='secondary' className='print:hidden text-xs'>Recorded</Badge>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
