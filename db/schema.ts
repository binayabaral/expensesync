import { z } from 'zod';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { integer, pgTable, text, timestamp, pgEnum, boolean, bigint, doublePrecision } from 'drizzle-orm/pg-core';

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
export const AccountTypeEnum = pgEnum('account_type', ['CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER']);

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
  isHidden: boolean('is_hidden').default(false).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull()
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
