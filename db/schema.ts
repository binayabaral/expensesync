import { z } from 'zod';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { integer, pgTable, text, timestamp, pgEnum, boolean, bigint, doublePrecision, date, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const TransactionTypeEnum = pgEnum('transaction_type', [
  'USER_CREATED',
  'INITIAL_BALANCE',
  'PEER_TRANSFER',
  'SELF_TRANSFER',
  'ASSET_BUY',
  'ASSET_RETURN',
  'ASSET_SELL'
]);

export const TransferTypeEnum = pgEnum('transfer_type', ['SELF_TRANSFER', 'PEER_TRANSFER']);

export const AssetTypeEnum = pgEnum('asset_type', ['GOLD_22K', 'GOLD_24K', 'SILVER', 'STOCK']);

export const RecurringPaymentTypeEnum = pgEnum('recurring_payment_type', ['TRANSACTION', 'TRANSFER']);
export const RecurringCadenceEnum = pgEnum('recurring_cadence', ['DAILY', 'MONTHLY', 'YEARLY']);
export const AccountTypeEnum = pgEnum('account_type', ['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER', 'BILL_SPLIT']);
export const SplitTypeEnum = pgEnum('split_type', ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']);
export const LoanSubTypeEnum = pgEnum('loan_sub_type', ['EMI', 'PEER']);
export const SUPPORTED_CURRENCIES = [
  'NPR', 'USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD', 'SGD', 'JPY',
  'CNY', 'SAR', 'QAR', 'THB', 'AED', 'MYR', 'KRW', 'SEK', 'DKK',
  'HKD', 'KWD', 'BHD', 'OMR'
] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];
export const CurrencyEnum = pgEnum('currency', [...SUPPORTED_CURRENCIES]);

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id').notNull(),
  accountType: AccountTypeEnum('account_type').notNull().default('CASH'),
  creditLimit: bigint('credit_limit', { mode: 'number' }),
  apr: doublePrecision('apr'),
  statementCloseDay: integer('statement_close_day'),
  statementCloseIsEom: boolean('statement_close_is_eom').notNull().default(false),
  paymentDueDay: integer('payment_due_day'),
  paymentDueDays: integer('payment_due_days'),
  minimumPaymentPercentage: doublePrecision('minimum_payment_percentage').notNull().default(2),
  loanSubType: LoanSubTypeEnum('loan_sub_type'),
  peerName: text('peer_name'),
  loanTenureMonths: integer('loan_tenure_months'),
  emiIntervalMonths: integer('emi_interval_months').notNull().default(1),
  isClosed: boolean('is_closed').notNull().default(false),
  closedAt: date('closed_at'),
  isHidden: boolean('is_hidden').default(false).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  currency: CurrencyEnum('currency').notNull().default('NPR')
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id').notNull()
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions)
}));

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  amount: bigint({ mode: 'number' }).notNull(),
  payee: text('payee').notNull(),
  notes: text('notes'),
  date: timestamp('date', { mode: 'date' }).notNull(),
  accountId: text('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  type: TransactionTypeEnum('type').default('USER_CREATED').notNull(),
  isBillSplit: boolean('is_bill_split').notNull().default(false),
  transferId: text('transfer_id').references(() => transfers.id, { onDelete: 'cascade' })
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  accounts: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id]
  }),
  categories: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id]
  })
}));

export const transfers = pgTable('transfers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  amount: integer('amount').notNull(),
  date: timestamp('date', { mode: 'date' }).notNull(),
  fromAccountId: text('from_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  toAccountId: text('to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  creditCardStatementId: text('credit_card_statement_id').references(() => creditCardStatements.id, {
    onDelete: 'set null'
  }),
  transferCharge: integer('transfer_charge').notNull().default(0),
  toAmount: integer('to_amount'),
  notes: text('notes')
});

export const creditCardStatements = pgTable('credit_card_statements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  periodStart: timestamp('period_start', { mode: 'date' }).notNull(),
  statementDate: timestamp('statement_date', { mode: 'date' }).notNull(),
  dueDate: timestamp('due_date', { mode: 'date' }).notNull(),
  statementBalance: bigint('statement_balance', { mode: 'number' }).notNull(),
  paymentDueAmount: bigint('payment_due_amount', { mode: 'number' }).notNull(),
  isPaymentDueOverridden: boolean('is_payment_due_overridden').notNull().default(false),
  minimumPayment: bigint('minimum_payment', { mode: 'number' }).notNull(),
  paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
  isPaid: boolean('is_paid').notNull().default(false),
  paidAt: timestamp('paid_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
  creditCardStatements: many(creditCardStatements)
}));

export const recurringPayments = pgTable('recurring_payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  type: RecurringPaymentTypeEnum('type').notNull(),
  cadence: RecurringCadenceEnum('cadence').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  transferCharge: bigint('transfer_charge', { mode: 'number' }).notNull().default(0),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  toAccountId: text('to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  notes: text('notes'),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  dayOfMonth: integer('day_of_month'),
  month: integer('month'),
  intervalMonths: integer('interval_months').notNull().default(1),
  lastCompletedAt: timestamp('last_completed_at', { mode: 'date' }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
});

export const transactionTransferRelations = relations(transactions, ({ one }) => ({
  transfers: one(transfers, {
    fields: [transactions.transferId],
    references: [transfers.id]
  })
}));

export const transfersRelations = relations(transfers, ({ many, one }) => ({
  transactions: many(transactions),
  creditCardStatement: one(creditCardStatements, {
    fields: [transfers.creditCardStatementId],
    references: [creditCardStatements.id]
  })
}));

export const creditCardStatementsRelations = relations(creditCardStatements, ({ one, many }) => ({
  account: one(accounts, {
    fields: [creditCardStatements.accountId],
    references: [accounts.id]
  }),
  transfers: many(transfers)
}));

export const recurringPaymentsRelations = relations(recurringPayments, ({ one }) => ({
  account: one(accounts, {
    fields: [recurringPayments.accountId],
    references: [accounts.id]
  }),
  toAccount: one(accounts, {
    fields: [recurringPayments.toAccountId],
    references: [accounts.id]
  }),
  category: one(categories, {
    fields: [recurringPayments.categoryId],
    references: [categories.id]
  })
}));

export const assets = pgTable('assets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  type: AssetTypeEnum('type').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  unit: text('unit').notNull(),
  assetPrice: bigint('asset_price', { mode: 'number' }).notNull(),
  extraCharge: bigint('extra_charge', { mode: 'number' }).notNull().default(0),
  totalPaid: bigint('total_paid', { mode: 'number' }).notNull(),
  accountId: text('account_id')
    .references(() => accounts.id, { onDelete: 'no action' })
    .notNull(),
  buyTransactionId: text('buy_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  sellTransactionId: text('sell_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  isSold: boolean('is_sold').notNull().default(false),
  soldAt: timestamp('sold_at', { mode: 'date' }),
  sellAmount: bigint('sell_amount', { mode: 'number' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
});

export const assetsRelations = relations(assets, ({ one }) => ({
  account: one(accounts, {
    fields: [assets.accountId],
    references: [accounts.id]
  })
}));

export const assetLots = pgTable('asset_lots', {
  id: text('id').primaryKey(),
  assetId: text('asset_id')
    .references(() => assets.id, { onDelete: 'cascade' })
    .notNull(),
  quantity: doublePrecision('quantity').notNull(),
  unit: text('unit').notNull(),
  assetPrice: bigint('asset_price', { mode: 'number' }).notNull(),
  sellPrice: bigint('sell_price', { mode: 'number' }),
  extraCharge: bigint('extra_charge', { mode: 'number' }).notNull().default(0),
  totalPaid: bigint('total_paid', { mode: 'number' }).notNull(),
  accountId: text('account_id')
    .references(() => accounts.id, { onDelete: 'no action' })
    .notNull(),
  buyTransactionId: text('buy_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  sellPrincipalTransactionId: text('sell_principal_transaction_id').references(() => transactions.id, {
    onDelete: 'set null'
  }),
  sellProfitTransactionId: text('sell_profit_transaction_id').references(() => transactions.id, {
    onDelete: 'set null'
  }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
});

export const assetLotsRelations = relations(assetLots, ({ one }) => ({
  asset: one(assets, {
    fields: [assetLots.assetId],
    references: [assets.id]
  }),
  account: one(accounts, {
    fields: [assetLots.accountId],
    references: [accounts.id]
  })
}));

export const assetPrices = pgTable('asset_prices', {
  id: text('id').primaryKey(),
  type: AssetTypeEnum('type').notNull(),
  // For stocks, this is the stock symbol (e.g. 'AAPL', 'GOOGL', 'MSFT'); for metals, this is null.
  symbol: text('symbol'),
  // For metals, this is the unit (e.g. 'tola', 'gm'); for stocks it can be empty or a generic marker.
  unit: text('unit').notNull(),
  // Live price per unit in mili-units (to stay consistent with amounts elsewhere)
  price: bigint('price', { mode: 'number' }).notNull(),
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).defaultNow().notNull()
});

// ─── Bill Split ───────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(), // = Clerk userId
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
});

export const splitContacts = pgTable('split_contacts', {
  id: text('id').primaryKey(),
  createdByUserId: text('created_by_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  linkedUserId: text('linked_user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email'),
  name: text('name').notNull(),
  virtualAccountId: text('virtual_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
}, (t) => [
  index('idx_sc_created_by').on(t.createdByUserId),
  index('idx_sc_linked_user').on(t.linkedUserId)
]);

export const splitGroups = pgTable('split_groups', {
  id: text('id').primaryKey(),
  createdByUserId: text('created_by_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  currency: CurrencyEnum('currency').notNull().default('NPR'),
  isArchived: boolean('is_archived').notNull().default(false),
  simplifyDebts: boolean('simplify_debts').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
});

export const splitGroupMembers = pgTable('split_group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .references(() => splitGroups.id, { onDelete: 'cascade' })
    .notNull(),
  contactId: text('contact_id')
    .references(() => splitContacts.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  virtualAccountId: text('virtual_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  addedAt: timestamp('added_at', { mode: 'date' }).defaultNow().notNull()
}, (t) => [
  index('idx_sgm_group_user').on(t.groupId, t.userId),
  index('idx_sgm_user_id').on(t.userId),
  uniqueIndex('uq_sgm_group_contact').on(t.groupId, t.contactId)
]);

export const splitExpenses = pgTable('split_expenses', {
  id: text('id').primaryKey(),
  createdByUserId: text('created_by_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  groupId: text('group_id').references(() => splitGroups.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
  currency: CurrencyEnum('currency').notNull().default('NPR'),
  date: timestamp('date', { mode: 'date' }).notNull(),
  paidByContactId: text('paid_by_contact_id').references(() => splitContacts.id, { onDelete: 'set null' }),
  paidByUser: boolean('paid_by_user').notNull().default(false),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  splitType: SplitTypeEnum('split_type').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
}, (t) => [
  index('idx_se_group_id').on(t.groupId),
  index('idx_se_created_by').on(t.createdByUserId)
]);

export const splitExpenseShares = pgTable('split_expense_shares', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id')
    .references(() => splitExpenses.id, { onDelete: 'cascade' })
    .notNull(),
  contactId: text('contact_id').references(() => splitContacts.id, { onDelete: 'set null' }),
  isUser: boolean('is_user').notNull().default(false),
  shareAmount: bigint('share_amount', { mode: 'number' }).notNull(),
  splitValue: doublePrecision('split_value').notNull(),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  receivableTransactionId: text('receivable_transaction_id').references(() => transactions.id, { onDelete: 'set null' })
}, (t) => [
  index('idx_ses_expense_id').on(t.expenseId),
  index('idx_ses_contact_id').on(t.contactId)
]);

export const splitSettlements = pgTable('split_settlements', {
  id: text('id').primaryKey(),
  createdByUserId: text('created_by_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  groupId: text('group_id').references(() => splitGroups.id, { onDelete: 'set null' }),
  fromIsUser: boolean('from_is_user').notNull().default(false),
  fromContactId: text('from_contact_id').references(() => splitContacts.id, { onDelete: 'set null' }),
  toIsUser: boolean('to_is_user').notNull().default(false),
  toContactId: text('to_contact_id').references(() => splitContacts.id, { onDelete: 'set null' }),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: CurrencyEnum('currency').notNull().default('NPR'),
  date: timestamp('date', { mode: 'date' }).notNull(),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  transferId: text('transfer_id').references(() => transfers.id, { onDelete: 'set null' }),
  settleGroupsBatchId: text('settle_groups_batch_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
}, (t) => [
  index('idx_ss_group_id').on(t.groupId),
  index('idx_ss_created_by').on(t.createdByUserId),
  index('idx_ss_from_contact').on(t.fromContactId),
  index('idx_ss_to_contact').on(t.toContactId),
  index('idx_ss_batch_id').on(t.settleGroupsBatchId)
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdContacts: many(splitContacts, { relationName: 'createdContacts' }),
  linkedContacts: many(splitContacts, { relationName: 'linkedContacts' }),
  createdGroups: many(splitGroups),
  groupMemberships: many(splitGroupMembers),
  createdExpenses: many(splitExpenses),
  createdSettlements: many(splitSettlements)
}));

export const splitContactsRelations = relations(splitContacts, ({ one, many }) => ({
  createdBy: one(users, { fields: [splitContacts.createdByUserId], references: [users.id], relationName: 'createdContacts' }),
  linkedUser: one(users, { fields: [splitContacts.linkedUserId], references: [users.id], relationName: 'linkedContacts' }),
  virtualAccount: one(accounts, { fields: [splitContacts.virtualAccountId], references: [accounts.id] }),
  groupMemberships: many(splitGroupMembers),
  expenseShares: many(splitExpenseShares)
}));

export const splitGroupsRelations = relations(splitGroups, ({ one, many }) => ({
  createdBy: one(users, { fields: [splitGroups.createdByUserId], references: [users.id] }),
  members: many(splitGroupMembers),
  expenses: many(splitExpenses),
  settlements: many(splitSettlements)
}));

export const splitGroupMembersRelations = relations(splitGroupMembers, ({ one }) => ({
  group: one(splitGroups, { fields: [splitGroupMembers.groupId], references: [splitGroups.id] }),
  contact: one(splitContacts, { fields: [splitGroupMembers.contactId], references: [splitContacts.id] }),
  user: one(users, { fields: [splitGroupMembers.userId], references: [users.id] }),
  virtualAccount: one(accounts, { fields: [splitGroupMembers.virtualAccountId], references: [accounts.id] })
}));

export const splitExpensesRelations = relations(splitExpenses, ({ one, many }) => ({
  createdBy: one(users, { fields: [splitExpenses.createdByUserId], references: [users.id] }),
  group: one(splitGroups, { fields: [splitExpenses.groupId], references: [splitGroups.id] }),
  paidByContact: one(splitContacts, { fields: [splitExpenses.paidByContactId], references: [splitContacts.id] }),
  category: one(categories, { fields: [splitExpenses.categoryId], references: [categories.id] }),
  shares: many(splitExpenseShares)
}));

export const splitExpenseSharesRelations = relations(splitExpenseShares, ({ one }) => ({
  expense: one(splitExpenses, { fields: [splitExpenseShares.expenseId], references: [splitExpenses.id] }),
  contact: one(splitContacts, { fields: [splitExpenseShares.contactId], references: [splitContacts.id] }),
  transaction: one(transactions, { fields: [splitExpenseShares.transactionId], references: [transactions.id] })
}));

export const splitSettlementsRelations = relations(splitSettlements, ({ one }) => ({
  createdBy: one(users, { fields: [splitSettlements.createdByUserId], references: [users.id] }),
  group: one(splitGroups, { fields: [splitSettlements.groupId], references: [splitGroups.id] }),
  fromContact: one(splitContacts, { fields: [splitSettlements.fromContactId], references: [splitContacts.id] }),
  toContact: one(splitContacts, { fields: [splitSettlements.toContactId], references: [splitContacts.id] }),
  transaction: one(transactions, { fields: [splitSettlements.transactionId], references: [transactions.id] }),
  transfer: one(transfers, { fields: [splitSettlements.transferId], references: [transfers.id] })
}));

export const insertSplitContactSchema = createInsertSchema(splitContacts);
export const insertSplitGroupSchema = createInsertSchema(splitGroups);
export const insertSplitExpenseSchema = createInsertSchema(splitExpenses).extend({
  date: z.coerce.date(),
  createdAt: z.coerce.date().optional()
});
export const insertSplitExpenseShareSchema = createInsertSchema(splitExpenseShares);
export const insertSplitSettlementSchema = createInsertSchema(splitSettlements).extend({
  date: z.coerce.date(),
  createdAt: z.coerce.date().optional()
});

export const insertAccountSchema = createInsertSchema(accounts);
export const insertCategorySchema = createInsertSchema(accounts);
export const insertTransferSchema = createInsertSchema(transfers).extend({
  date: z.coerce.date()
});
export const insertCreditCardStatementSchema = createInsertSchema(creditCardStatements).extend({
  periodStart: z.coerce.date(),
  statementDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional(),
  createdAt: z.coerce.date().optional()
});
export const insertRecurringPaymentSchema = createInsertSchema(recurringPayments).extend({
  startDate: z.coerce.date(),
  lastCompletedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});
export const insertTransactionSchema = createInsertSchema(transactions).extend({
  date: z.coerce.date()
});
export const insertAssetSchema = createInsertSchema(assets).extend({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});
export const insertAssetLotSchema = createInsertSchema(assetLots).extend({
  date: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});
export const insertAssetPriceSchema = createInsertSchema(assetPrices).extend({
  fetchedAt: z.coerce.date().optional()
});
