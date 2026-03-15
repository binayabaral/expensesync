import { create } from 'zustand';

type State = {
  isOpen: boolean;
  groupId?: string | null;
  onOpen: (groupId?: string | null) => void;
  onClose: () => void;
};

export const useOpenAddExpenseSheet = create<State>(set => ({
  isOpen: false,
  groupId: null,
  onOpen: (groupId = null) => set({ isOpen: true, groupId }),
  onClose: () => set({ isOpen: false, groupId: null })
}));
