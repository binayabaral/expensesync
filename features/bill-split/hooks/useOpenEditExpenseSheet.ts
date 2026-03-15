import { create } from 'zustand';

type Share = {
  label: string;
  contactId: string | null;
  isUser: boolean;
  splitValue: number;
};

export type EditExpenseInitialValues = {
  description: string;
  totalAmount: number; // mili-units
  date: Date;
  paidBy: string; // 'user' or contactId
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';
  categoryId: string | null;
  notes: string | null;
  shares: Share[];
};

type State = {
  isOpen: boolean;
  expenseId?: string;
  groupId?: string | null;
  initialValues?: EditExpenseInitialValues;
  onOpen: (data: { expenseId: string; groupId: string | null; initialValues: EditExpenseInitialValues }) => void;
  onClose: () => void;
};

export const useOpenEditExpenseSheet = create<State>(set => ({
  isOpen: false,
  expenseId: undefined,
  groupId: undefined,
  initialValues: undefined,
  onOpen: ({ expenseId, groupId, initialValues }) => set({ isOpen: true, expenseId, groupId, initialValues }),
  onClose: () => set({ isOpen: false, expenseId: undefined, groupId: undefined, initialValues: undefined })
}));
