'use client';

import { useEffect, useMemo, useState } from 'react';
import isMobile from 'is-mobile';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { Select } from '@/components/Select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { formatCurrency, convertAmountFromMiliUnits } from '@/lib/utils';
import { useGetCreditCards } from '@/features/credit-cards/api/useGetCreditCards';
import { useGetCreditCardStatements } from '@/features/credit-cards/api/useGetCreditCardStatements';
import { useOpenCloseStatementSheet } from '@/features/credit-cards/hooks/useOpenCloseStatementSheet';
import { useOpenEditStatementSheet } from '@/features/credit-cards/hooks/useOpenEditStatementSheet';
import { CloseStatementSheet } from '@/features/credit-cards/components/CloseStatementSheet';
import { EditStatementSheet } from '@/features/credit-cards/components/EditStatementSheet';
import { CreditCardStatementsTable } from '@/features/credit-cards/components/CreditCardStatementsTable';
import { useOpenAddTransferSheet } from '@/features/transfers/hooks/useOpenAddTransferSheet';

export default function CreditCardsPage() {
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const creditCardsQuery = useGetCreditCards();
  const cards = useMemo(() => creditCardsQuery.data ?? [], [creditCardsQuery.data]);

  const { onOpen: openCloseStatementSheet } = useOpenCloseStatementSheet();
  const { onOpen: openEditStatementSheet } = useOpenEditStatementSheet();
  const { onOpen: openTransferSheet } = useOpenAddTransferSheet();

  useEffect(() => {
    if (!selectedCardId && cards.length > 0) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  const selectedCard = useMemo(
    () => cards.find(card => card.id === selectedCardId),
    [cards, selectedCardId]
  );

  const statementsQuery = useGetCreditCardStatements({
    accountId: selectedCardId || undefined
  });

  const statements = statementsQuery.data ?? [];
  const isLoading = creditCardsQuery.isLoading || statementsQuery.isLoading;

  const accountOptions = cards.map(card => ({
    label: card.name,
    value: card.id
  }));

  const onPayStatement = () => {
    if (!selectedCard?.nextStatement) {
      return;
    }

    openTransferSheet({
      defaultValues: {
        toAccountId: selectedCard.id,
        amount: convertAmountFromMiliUnits(selectedCard.nextStatement.paymentDueAmount).toString(),
        transferCharge: '0',
        notes: `Payment for statement ${format(new Date(selectedCard.nextStatement.statementDate), 'MMM dd, yyyy')}`,
        creditCardStatementId: selectedCard.nextStatement.id
      }
    });
  };

  return (
    <div className='space-y-4'>
      <CloseStatementSheet />
      <EditStatementSheet />
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader className='gap-y-2 lg:flex-row lg:items-center lg:justify-between space-y-0'>
          <CardTitle className='text-lg font-semibold'>Credit Cards</CardTitle>
          {accountOptions.length > 0 && (
            <div className='w-full max-w-xs'>
              {isMobile() ? (
                <NativeSelect
                  value={selectedCardId}
                  onChange={event => setSelectedCardId(event.target.value)}
                  className='w-full'
                >
                  {accountOptions.map(option => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Select
                  value={selectedCardId}
                  placeholder='Select credit card'
                  options={accountOptions}
                  allowCreatingOptions={false}
                  onChangeAction={value => setSelectedCardId(value ?? '')}
                />
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {creditCardsQuery.isLoading ? (
            <div className='h-40 w-full flex items-center justify-center'>
              <Loader2 className='size-6 text-slate-300 animate-spin' />
            </div>
          ) : !selectedCard ? (
            <div className='text-sm text-muted-foreground'>No credit cards configured yet.</div>
          ) : (
            <div className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-1 text-sm'>
                  <div>Current Owed: <span className='font-medium'>{formatCurrency(selectedCard.currentOwed)}</span></div>
                  <div>Credit Limit: <span className='font-medium'>{formatCurrency(selectedCard.creditLimit ?? 0)}</span></div>
                  <div>Available Credit: <span className='font-medium'>{formatCurrency(selectedCard.availableCredit ?? 0)}</span></div>
                  <div>Utilization: <span className='font-medium'>{selectedCard.utilization !== null ? `${Math.round(selectedCard.utilization * 100)}%` : 'N/A'}</span></div>
                  <div>APR: <span className='font-medium'>{selectedCard.apr ? `${selectedCard.apr.toFixed(2)}%` : 'N/A'}</span></div>
                </div>
                <div className='space-y-1 text-sm'>
                  <div>Next Statement Due: <span className='font-medium'>{selectedCard.nextStatement ? formatCurrency(selectedCard.nextStatement.paymentDueAmount) : 'N/A'}</span></div>
                  <div>Minimum Payment: <span className='font-medium'>{selectedCard.nextStatement ? formatCurrency(selectedCard.nextStatement.minimumPayment) : 'N/A'}</span></div>
                  <div>Statement Balance: <span className='font-medium'>{selectedCard.nextStatement ? formatCurrency(selectedCard.nextStatement.statementBalance) : 'N/A'}</span></div>
                  <div>Interest Estimate: <span className='font-medium'>{selectedCard.nextStatement?.interestEstimate ? formatCurrency(selectedCard.nextStatement.interestEstimate) : 'N/A'}</span></div>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button onClick={() => openCloseStatementSheet(selectedCard.id)} disabled={isLoading}>
                  Close Statement
                </Button>
                <Button variant='outline' onClick={onPayStatement} disabled={!selectedCard.nextStatement || isLoading}>
                  Pay Statement
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className='border border-slate-200 shadow-none'>
        <CardHeader>
          <CardTitle className='text-lg font-semibold'>Statements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='h-40 w-full flex items-center justify-center'>
              <Loader2 className='size-6 text-slate-300 animate-spin' />
            </div>
          ) : (
            <CreditCardStatementsTable
              statements={statements}
              onOverride={statement => {
                openEditStatementSheet(statement);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
