import { z } from 'zod';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { integer, pgTable, text, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const TransactionTypeEnum = pgEnum('transaction_type', [
  'USER_CREATED',
  'INITIAL_BALANCE',
  'PEER_TRANSFER',
  'SELF_TRANSFER'
]);

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id').notNull(),
  isHidden: boolean('is_hidden').default(false).notNull()
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions)
}));

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
  amount: integer('amount').notNull(),
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
  fromAccountId: text('from_account_id')
    .references(() => accounts.id, { onDelete: 'set null' })
    .notNull(),
  toAccountId: text('to_account_id')
    .references(() => accounts.id, { onDelete: 'set null' })
    .notNull(),
  transferCharge: integer('transfer_charge').notNull().default(0),
  notes: text('notes')
});

export const transactionTransferRelations = relations(transactions, ({ one }) => ({
  transfers: one(transfers, {
    fields: [transactions.transferId],
    references: [transfers.id]
  })
}));

export const transfersRelations = relations(transfers, ({ many }) => ({
  transactions: many(transactions)
}));

export const insertAccountSchema = createInsertSchema(accounts);
export const insertCategorySchema = createInsertSchema(accounts);
export const insertTransferSchema = createInsertSchema(transfers).extend({
  date: z.coerce.date()
});
export const insertTransactionSchema = createInsertSchema(transactions).extend({
  date: z.coerce.date()
});
