import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const operationType = pgEnum('operation_type', ['expense', 'income'])
export const subscriptionStatus = pgEnum('subscription_status', [
  'active',
  'paused',
  'cancelled',
])
export const billingFrequency = pgEnum('billing_frequency', [
  'monthly',
  'yearly',
])

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  defaultCurrency: text('default_currency').notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    type: operationType('type').notNull(),
    color: text('color').notNull(),
  },
  (table) => [
    uniqueIndex('categories_user_name_type_idx').on(
      table.userId,
      table.name,
      table.type,
    ),
  ],
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    subscriptionId: uuid('subscription_id'),
    type: operationType('type').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    operationDate: date('operation_date').notNull(),
    note: text('note'),
    labels: jsonb('labels').$type<string[]>().notNull().default([]),
    photoUrl: text('photo_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('transactions_user_date_idx').on(table.userId, table.operationDate),
  ],
)

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    billingDay: integer('billing_day').notNull(),
    nextChargeDate: date('next_charge_date').notNull(),
    billingFrequency: billingFrequency('billing_frequency')
      .notNull()
      .default('monthly'),
    status: subscriptionStatus('status').notNull().default('active'),
    autoCreateTransactions: boolean('auto_create_transactions')
      .notNull()
      .default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('subscriptions_user_next_charge_idx').on(
      table.userId,
      table.nextChargeDate,
    ),
  ],
)

export const labels = pgTable(
  'labels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('labels_user_name_idx').on(table.userId, table.name),
  ],
)

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('api_keys_user_id_idx').on(table.userId),
  ],
)

export const whitelistedEmails = pgTable(
  'whitelisted_emails',
  {
    email: text('email').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    url: text('url'),
    plannedDate: date('planned_date'),
    isBought: boolean('is_bought').notNull().default(false),
    amountMinor: integer('amount_minor'),
    currency: text('currency'),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    boughtTransactionId: uuid('bought_transaction_id').references(
      () => transactions.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('wishlist_user_bought_idx').on(table.userId, table.isBought),
  ],
)

export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  baseCurrency: text('base_currency').notNull(),
  quoteCurrency: text('quote_currency').notNull(),
  rate: numeric('rate', { precision: 18, scale: 8 }).notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
