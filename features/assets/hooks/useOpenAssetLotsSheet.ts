import { create } from 'zustand';

type AssetLotsSheetState = {
  assetId?: string;
  isOpen: boolean;
  onOpen: (assetId: string) => void;
  onClose: () => void;
};

export const useOpenAssetLotsSheet = create<AssetLotsSheetState>(set => ({
  assetId: undefined,
  isOpen: false,
  onOpen: (assetId: string) => set({ isOpen: true, assetId }),
  onClose: () => set({ isOpen: false, assetId: undefined })
}));


