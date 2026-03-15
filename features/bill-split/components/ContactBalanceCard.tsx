'use client';

import { FaCircleCheck, FaCircle } from 'react-icons/fa6';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useOpenAddSettlementSheet } from '../hooks/useOpenAddSettlementSheet';

type Props = {
  contact: {
    key: string;
    contactId: string | null;
    name: string;
    email: string | null;
    linkedUserId: string | null;
    virtualAccountId: string | null;
    netAmount: number;
  };
};

export function ContactBalanceCard({ contact }: Props) {
  const { onOpen } = useOpenAddSettlementSheet();
  const isOwedToYou = contact.netAmount > 0;
  const isSettled = contact.netAmount === 0;

  return (
    <Card className='h-full'>
      <CardContent className='pt-4 space-y-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <div className='flex items-center gap-1.5'>
              <p className='text-sm font-semibold truncate'>{contact.name}</p>
              {contact.linkedUserId ? (
                <Badge variant='secondary' className='text-xs shrink-0'>enrolled</Badge>
              ) : (
                <Badge variant='outline' className='text-xs shrink-0 text-muted-foreground'>pending</Badge>
              )}
            </div>
            {contact.email && <p className='text-xs text-muted-foreground truncate'>{contact.email}</p>}
          </div>
          {isSettled ? (
            <FaCircleCheck className='h-4 w-4 text-emerald-500 shrink-0 mt-0.5' />
          ) : (
            <FaCircle className={`h-4 w-4 shrink-0 mt-0.5 ${isOwedToYou ? 'text-emerald-500' : 'text-rose-500'}`} />
          )}
        </div>

        {isSettled ? (
          <p className='text-sm text-muted-foreground'>All settled up</p>
        ) : (
          <div>
            <p className={`text-base font-semibold ${isOwedToYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(Math.abs(contact.netAmount))}
            </p>
            <p className='text-xs text-muted-foreground'>
              {isOwedToYou ? `${contact.name} owes you` : `You owe ${contact.name}`}
            </p>
          </div>
        )}

        {!isSettled && (
          <Button
            size='sm'
            variant='outline'
            className='w-full'
            disabled={!contact.contactId}
            title={!contact.contactId ? 'Add this person as a contact to settle up' : undefined}
            onClick={() => {
              if (!contact.contactId) return;
              onOpen({
                contactId: contact.contactId,
                contactName: contact.name,
                direction: isOwedToYou ? 'receiving' : 'paying'
              });
            }}
          >
            Settle up
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
