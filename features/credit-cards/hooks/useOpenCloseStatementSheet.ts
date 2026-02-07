import { create } from 'zustand';

type CloseStatementState = {
  accountId?: string;
  isOpen: boolean;
  onClose: () => void;
  onOpen: (accountId: string) => void;
};

export const useOpenCloseStatementSheet = create<CloseStatementState>(set => ({
  accountId: undefined,
  isOpen: false,
  onOpen: accountId => set({ isOpen: true, accountId }),
  onClose: () => set({ isOpen: false, accountId: undefined })
}));
