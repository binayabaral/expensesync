import { create } from 'zustand';

type AddAccount = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useAddAccount = create<AddAccount>(set => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false })
}));
