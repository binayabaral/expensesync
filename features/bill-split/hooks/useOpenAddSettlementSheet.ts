import { create } from 'zustand';

export type SettlementGroupMember = {
  contactId: string;
  contactName: string;
  netAmount?: number; // positive = they owe you, negative = you owe them
};

type SettlementDefaults = {
  contactId?: string;
  contactName?: string;
  direction?: 'paying' | 'receiving';
  groupId?: string | null;
  groupName?: string;
  groupMembers?: SettlementGroupMember[];
};

type State = {
  isOpen: boolean;
  defaults?: SettlementDefaults;
  onOpen: (defaults?: SettlementDefaults) => void;
  onClose: () => void;
};

export const useOpenAddSettlementSheet = create<State>(set => ({
  isOpen: false,
  defaults: undefined,
  onOpen: (defaults) => set({ isOpen: true, defaults }),
  onClose: () => set({ isOpen: false, defaults: undefined })
}));
