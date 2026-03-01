import { create } from 'zustand';

type InitialValues = {
  toAccountId?: string;
  dayOfMonth?: number;
};

type AddRecurringPaymentState = {
  isOpen: boolean;
  initialValues?: InitialValues;
  onOpen: (initialValues?: InitialValues) => void;
  onClose: () => void;
};

export const useAddRecurringPayment = create<AddRecurringPaymentState>(set => ({
  isOpen: false,
  initialValues: undefined,
  onOpen: (initialValues?: InitialValues) => set({ isOpen: true, initialValues }),
  onClose: () => set({ isOpen: false, initialValues: undefined })
}));
