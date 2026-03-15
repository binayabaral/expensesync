import { create } from 'zustand';

type State = {
  isOpen: boolean;
  groupId?: string;
  existingMemberContactIds: string[];
  onOpen: (groupId: string, existingMemberContactIds: string[]) => void;
  onClose: () => void;
};

export const useOpenAddMemberSheet = create<State>(set => ({
  isOpen: false,
  groupId: undefined,
  existingMemberContactIds: [],
  onOpen: (groupId, existingMemberContactIds) => set({ isOpen: true, groupId, existingMemberContactIds }),
  onClose: () => set({ isOpen: false, groupId: undefined, existingMemberContactIds: [] })
}));
