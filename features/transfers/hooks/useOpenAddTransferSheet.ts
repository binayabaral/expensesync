import { create } from 'zustand';

type OpenAddTransferSheetType = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useOpenAddTransferSheet = create<OpenAddTransferSheetType>(set => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false })
}));
