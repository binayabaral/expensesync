'use client';

import { Suspense } from 'react';
import { useMountedState } from 'react-use';

import { AddAccount } from '@/features/accounts/components/AddAccount';
import { EditAccountSheet } from '@/features/accounts/components/EditAccountSheet';
import { AddTransferSheet } from '@/features/transfers/components/AddTransferSheet';
import { AddCategorySheet } from '@/features/categories/components/AddCategorySheet';
import { EditTransferSheet } from '@/features/transfers/components/EditTransferSheet';
import { EditCategorySheet } from '@/features/categories/components/EditCategorySheet';
import { AddTransactionSheet } from '@/features/transactions/components/AddTransactionSheet';
import { EditTransactionSheet } from '@/features/transactions/components/EditTransactionSheet';
import { AddAssetSheet } from '@/features/assets/components/AddAssetSheet';
import { SellAssetSheet } from '@/features/assets/components/SellAssetSheet';
import { AddRecurringPaymentSheet } from '@/features/recurring-payments/components/AddRecurringPaymentSheet';
import { EditRecurringPaymentSheet } from '@/features/recurring-payments/components/EditRecurringPaymentSheet';
import { AddGroupSheet } from '@/features/bill-split/components/AddGroupSheet';
import { EditGroupSheet } from '@/features/bill-split/components/EditGroupSheet';
import { AddExpenseSheet } from '@/features/bill-split/components/AddExpenseSheet';
import { EditExpenseSheet } from '@/features/bill-split/components/EditExpenseSheet';
import { RecordShareSheet } from '@/features/bill-split/components/RecordShareSheet';
import { AddSettlementSheet } from '@/features/bill-split/components/AddSettlementSheet';
import { EditSettlementSheet } from '@/features/bill-split/components/EditSettlementSheet';
import { AddContactSheet } from '@/features/bill-split/components/AddContactSheet';
import { AddMemberSheet } from '@/features/bill-split/components/AddMemberSheet';

export const SheetProvider = ({ children }: { children: React.ReactNode }) => {
  const isMounted = useMountedState();

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AddAccount />
      <EditAccountSheet />

      <AddCategorySheet />
      <EditCategorySheet />

      <Suspense>
        <AddTransactionSheet />
      </Suspense>
      <EditTransactionSheet />

      <AddTransferSheet />
      <EditTransferSheet />
      <AddRecurringPaymentSheet />
      <EditRecurringPaymentSheet />
      <Suspense>
        <AddAssetSheet />
      </Suspense>
      <SellAssetSheet />
      <AddGroupSheet />
      <EditGroupSheet />
      <Suspense>
        <AddExpenseSheet />
      </Suspense>
      <Suspense>
        <EditExpenseSheet />
      </Suspense>
      <Suspense>
        <RecordShareSheet />
      </Suspense>
      <AddSettlementSheet />
      <EditSettlementSheet />
      <AddContactSheet />
      <AddMemberSheet />
      {children}
    </>
  );
};
