import { create } from 'zustand';

type AddAssetState = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useAddAsset = create<AddAssetState>(set => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false })
}));


