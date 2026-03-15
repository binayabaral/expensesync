import { create } from 'zustand';

type OpenParams = {
  expenseId: string;
  shareId: string;
  shareAmount: number;
  totalAmount: number;
  paidByUser: boolean;
  contextName: string;
  categoryId?: string | null;
  // Edit mode — pass these when editing an existing recording
  transactionId?: string | null;
  receivableTransactionId?: string | null;
  initialDate?: Date;
  initialNotes?: string | null;
  initialAccountId?: string | null;
};

type State = {
  isOpen: boolean;
  expenseId?: string;
  shareId?: string;
  shareAmount?: number;
  totalAmount?: number;
  paidByUser?: boolean;
  contextName?: string;
  categoryId?: string | null;
  transactionId?: string | null;
  receivableTransactionId?: string | null;
  initialDate?: Date;
  initialNotes?: string | null;
  initialAccountId?: string | null;
  onOpen: (params: OpenParams) => void;
  onClose: () => void;
};

export const useOpenRecordShareSheet = create<State>(set => ({
  isOpen: false,
  expenseId: undefined,
  shareId: undefined,
  shareAmount: undefined,
  totalAmount: undefined,
  paidByUser: undefined,
  contextName: undefined,
  categoryId: undefined,
  transactionId: undefined,
  receivableTransactionId: undefined,
  initialDate: undefined,
  initialNotes: undefined,
  initialAccountId: undefined,
  onOpen: params =>
    set({ isOpen: true, ...params }),
  onClose: () =>
    set({
      isOpen: false,
      expenseId: undefined,
      shareId: undefined,
      shareAmount: undefined,
      totalAmount: undefined,
      paidByUser: undefined,
      contextName: undefined,
      categoryId: undefined,
      transactionId: undefined,
      receivableTransactionId: undefined,
      initialDate: undefined,
      initialNotes: undefined,
      initialAccountId: undefined
    })
}));
