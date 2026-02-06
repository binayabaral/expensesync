import { create } from 'zustand';

export type AddTransactionDefaults = {
  accountId?: string;
  payee?: string;
  notes?: string;
  amount?: string;
  categoryId?: string;
  date?: Date;
};

type AddTransaction = {
  isOpen: boolean;
  defaultValues?: AddTransactionDefaults;
  recurringPaymentId?: string;
  onOpen: (options?: { defaultValues?: AddTransactionDefaults; recurringPaymentId?: string }) => void;
  onClose: () => void;
};

export const useAddTransaction = create<AddTransaction>(set => ({
  isOpen: false,
  defaultValues: undefined,
  recurringPaymentId: undefined,
  onOpen: options =>
    set({
      isOpen: true,
      defaultValues: options?.defaultValues,
      recurringPaymentId: options?.recurringPaymentId
    }),
  onClose: () => set({ isOpen: false, defaultValues: undefined, recurringPaymentId: undefined })
}));
