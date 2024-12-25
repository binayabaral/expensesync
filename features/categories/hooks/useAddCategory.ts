import { create } from 'zustand';

type AddCategory = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useAddCategory = create<AddCategory>(set => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false })
}));
