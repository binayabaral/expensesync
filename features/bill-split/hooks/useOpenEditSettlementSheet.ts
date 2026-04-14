import { create } from 'zustand';

import type { SettlementGroupMember } from './useOpenAddSettlementSheet';

export type EditSettlementData = {
  id: string;
  contactId?: string;
  contactName?: string;
  direction?: 'paying' | 'receiving';
  groupId?: string | null;
  groupName?: string;
  groupMembers?: SettlementGroupMember[];
  amount?: number;
  date?: Date;
  notes?: string | null;
  initialAccountId?: string | null;
  initialTransferCharge?: number | null;
};

type State = {
  isOpen: boolean;
  data?: EditSettlementData;
  onOpen: (data: EditSettlementData) => void;
  onClose: () => void;
};

export const useOpenEditSettlementSheet = create<State>(set => ({
  isOpen: false,
  data: undefined,
  onOpen: (data) => set({ isOpen: true, data }),
  onClose: () => set({ isOpen: false, data: undefined })
}));
