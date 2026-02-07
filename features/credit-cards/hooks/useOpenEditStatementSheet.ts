import { create } from 'zustand';

type Statement = {
  id: string;
  accountId: string;
  statementDate: Date | string;
  dueDate: Date | string;
  paymentDueAmount: number;
  minimumPayment: number;
  isPaid: boolean;
};

type EditStatementState = {
  statement?: Statement;
  isOpen: boolean;
  onClose: () => void;
  onOpen: (statement: Statement) => void;
};

export const useOpenEditStatementSheet = create<EditStatementState>(set => ({
  statement: undefined,
  isOpen: false,
  onOpen: statement => set({ isOpen: true, statement }),
  onClose: () => set({ isOpen: false, statement: undefined })
}));
