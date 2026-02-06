import { create } from 'zustand';

export type AddTransferDefaults = {
  fromAccountId?: string | null;
  toAccountId?: string | null;
  amount?: string;
  transferCharge?: string;
  notes?: string | null;
  date?: Date;
};

type OpenAddTransferSheetType = {
  isOpen: boolean;
  defaultValues?: AddTransferDefaults;
  recurringPaymentId?: string;
  onOpen: (options?: { defaultValues?: AddTransferDefaults; recurringPaymentId?: string }) => void;
  onClose: () => void;
};

export const useOpenAddTransferSheet = create<OpenAddTransferSheetType>(set => ({
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
