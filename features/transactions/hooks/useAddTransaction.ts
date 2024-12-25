import { create } from 'zustand';

type AddTransaction = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useAddTransaction = create<AddTransaction>(set => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false })
}));
