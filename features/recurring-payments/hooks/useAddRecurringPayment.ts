import { create } from 'zustand';

type AddRecurringPaymentState = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useAddRecurringPayment = create<AddRecurringPaymentState>(set => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false })
}));
