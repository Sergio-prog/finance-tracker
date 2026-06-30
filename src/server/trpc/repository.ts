import { createHash, randomBytes } from 'node:crypto'

import { and, desc, eq, gte, inArray, lte, sum } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

import { db, hasDatabase } from '../db/client'
import {
  apiKeys as apiKeysTable,
  budgets as budgetsTable,
  categories as categoriesTable,
  labels as labelsTable,
  profiles as profilesTable,
  subscriptions as subscriptionsTable,
  transactions as transactionsTable,
  wishlistItems as wishlistItemsTable,
} from '../db/schema'
import { ensureFreshRates } from '../exchange-rates'
import type { AuthUser } from '../auth'
import type {
  Budget,
  BudgetWithSpending,
  Category,
  DashboardData,
  ExchangeRateEntry,
  Label,
  Profile,
  Subscription,
  Transaction,
  WishlistItem,
} from './types'
import type {
  budgetInput,
  budgetUpdate,
  categoryInput,
  labelInput,
  profileInput,
  subscriptionInput,
  subscriptionUpdate,
  transactionInput,
  transactionUpdate,
  wishlistItemInput,
  wishlistItemUpdate,
} from './validators'
import type { z } from 'zod'

const defaultCategories = [
  { name: 'Food', icon: '🍜', type: 'expense', color: '#9f5f2c' },
  { name: 'Groceries', icon: '🛒', type: 'expense', color: '#7a6a2f' },
  { name: 'Coffee', icon: '☕', type: 'expense', color: '#7b4d35' },
  { name: 'Home', icon: '🏠', type: 'expense', color: '#525252' },
  { name: 'Bills', icon: '🧾', type: 'expense', color: '#6f5b4f' },
  { name: 'Transport', icon: '🚕', type: 'expense', color: '#7c6f4f' },
  { name: 'Car', icon: '⛽', type: 'expense', color: '#72644f' },
  { name: 'Health', icon: '🫀', type: 'expense', color: '#8a3d3d' },
  { name: 'Travel', icon: '🏝️', type: 'expense', color: '#2f6f73' },
  { name: 'Shopping', icon: '🛍️', type: 'expense', color: '#854f65' },
  { name: 'Gifts', icon: '🎁', type: 'expense', color: '#875151' },
  { name: 'Pets', icon: '🐾', type: 'expense', color: '#6f654f' },
  { name: 'Education', icon: '📚', type: 'expense', color: '#4f6690' },
  { name: 'AI tools', icon: '🤖', type: 'expense', color: '#5d5c99' },
  { name: 'Hosting', icon: '🖥️', type: 'expense', color: '#52636b' },
  { name: 'Salary', icon: '💼', type: 'income', color: '#34785f' },
  { name: 'Side profit', icon: '🧾', type: 'income', color: '#4d6f9f' },
  { name: 'Freelance', icon: '🛠️', type: 'income', color: '#4d7b75' },
  { name: 'Investment', icon: '📈', type: 'income', color: '#5d7c45' },
  { name: 'Gift', icon: '💝', type: 'income', color: '#8a526f' },
  { name: 'Streaming', icon: '🎬', type: 'expense', color: '#5d6f7f' },
  { name: 'Productivity', icon: '⚡', type: 'expense', color: '#7f6f3f' },
  { name: 'Entertainment', icon: '🎮', type: 'expense', color: '#6a5a8a' },
  { name: 'Cloud', icon: '☁️', type: 'expense', color: '#4a7a9a' },
  { name: 'Fitness', icon: '💪', type: 'expense', color: '#4a8a5a' },
  { name: 'Dining', icon: '🍽️', type: 'expense', color: '#bf6f4f' },
  { name: 'Insurance', icon: '🛡️', type: 'expense', color: '#4f7f6f' },
] as const

const subscriptionCategoryDefaults = [
  { name: 'Streaming', icon: '🎬', type: 'expense' as const, color: '#5d6f7f' },
  { name: 'Productivity', icon: '⚡', type: 'expense' as const, color: '#7f6f3f' },
  { name: 'Entertainment', icon: '🎮', type: 'expense' as const, color: '#6a5a8a' },
  { name: 'Cloud', icon: '☁️', type: 'expense' as const, color: '#4a7a9a' },
  { name: 'Fitness', icon: '💪', type: 'expense' as const, color: '#4a8a5a' },
  { name: 'Socials', icon: '🌐', type: 'expense' as const, color: '#5b6fbf' },
  { name: 'News', icon: '📰', type: 'expense' as const, color: '#8a7f6f' },
  { name: 'VPN', icon: '🔒', type: 'expense' as const, color: '#5f8a8a' },
] as const

const allDefaultCategories = [...defaultCategories, ...subscriptionCategoryDefaults] as const

const defaultLabelNames = ['Must haves', 'Work', 'Family'] as const

function assertDatabase() {
  if (!hasDatabase || !db) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'DATABASE_URL is required to use real finance data.',
    })
  }

  return db
}

async function ensureUserWorkspace(user: AuthUser) {
  const database = assertDatabase()

  await ensureUserProfile(user)

  const [existingCategories, existingLabels] = await Promise.all([
    database
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, user.id)),
    database
      .select()
      .from(labelsTable)
      .where(eq(labelsTable.userId, user.id)),
  ])

  if (existingCategories.length === 0) {
    await seedDefaultCategories(user)
  }

  await seedSubscriptionCategories(user)

  if (existingLabels.length === 0) {
    await seedDefaultLabels(user)
  }
}

async function ensureUserProfile(user: AuthUser) {
  const database = assertDatabase()

  await database
    .insert(profilesTable)
    .values({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: {
        email: user.email,
        displayName: user.displayName,
        updatedAt: new Date(),
      },
    })
}

function seedDefaultCategories(user: AuthUser) {
  const database = assertDatabase()

  return database
    .insert(categoriesTable)
    .values(
      defaultCategories.map((category) => ({
        userId: user.id,
        ...category,
      })),
    )
    .returning()
}

function seedDefaultLabels(user: AuthUser) {
  const database = assertDatabase()

  return database
    .insert(labelsTable)
    .values(
      defaultLabelNames.map((name) => ({
        userId: user.id,
        name,
      })),
    )
    .returning()
}

function seedSubscriptionCategories(user: AuthUser) {
  const database = assertDatabase()

  return database
    .insert(categoriesTable)
    .values(
      subscriptionCategoryDefaults.map((category) => ({
        userId: user.id,
        ...category,
      })),
    )
    .onConflictDoNothing({
      target: [categoriesTable.userId, categoriesTable.name, categoriesTable.type],
    })
    .returning()
}

async function seedMissingCategories(
  user: AuthUser,
  categories: readonly { name: string; icon: string; type: 'expense' | 'income'; color: string }[],
) {
  const database = assertDatabase()

  return database
    .insert(categoriesTable)
    .values(
      categories.map((c) => ({
        userId: user.id,
        ...c,
      })),
    )
    .onConflictDoNothing({
      target: [categoriesTable.userId, categoriesTable.name, categoriesTable.type],
    })
    .returning()
}

export async function getDashboard(user: AuthUser): Promise<DashboardData> {
  const database = assertDatabase()

  await ensureUserProfile(user)

  const [
    loadedCategoryRows,
    transactionRows,
    subscriptionRows,
    labelRows,
    profileRows,
    wishlistRows,
    ratesMap,
  ] = await Promise.all([
    database
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, user.id)),
    database
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, user.id))
      .orderBy(desc(transactionsTable.operationDate)),
    database
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, user.id))
      .orderBy(desc(subscriptionsTable.nextChargeDate)),
    database
      .select()
      .from(labelsTable)
      .where(eq(labelsTable.userId, user.id))
      .orderBy(desc(labelsTable.createdAt)),
    database
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, user.id))
      .limit(1),
    database
      .select()
      .from(wishlistItemsTable)
      .where(eq(wishlistItemsTable.userId, user.id))
      .orderBy(desc(wishlistItemsTable.createdAt)),
    ensureFreshRates(),
  ])

  let categoryRows =
    loadedCategoryRows.length > 0
      ? loadedCategoryRows
      : await seedDefaultCategories(user)

  if (loadedCategoryRows.length > 0 && loadedCategoryRows.length < allDefaultCategories.length) {
    const newRows = await seedMissingCategories(user, allDefaultCategories)
    if (newRows.length > 0) {
      categoryRows = [...categoryRows, ...newRows]
    }
  }

  const categoryMap = new Map(
    categoryRows.map((category) => [category.id, category]),
  )

  const profileRow = profileRows[0]

  return {
    profile: {
      email: profileRow.email,
      displayName: profileRow.displayName,
      defaultCurrency: profileRow.defaultCurrency,
    },
    categories: categoryRows,
    labels: labelRows.map(
      (label): Label => ({
        id: label.id,
        name: label.name,
      }),
    ),
    transactions: transactionRows.map((transaction): Transaction => {
      const category = transaction.categoryId
        ? categoryMap.get(transaction.categoryId)
        : undefined

      return {
        id: transaction.id,
        type: transaction.type,
        categoryId: transaction.categoryId ?? '',
        categoryName: category?.name ?? 'Uncategorized',
        categoryIcon: category?.icon ?? '•',
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        operationDate: transaction.operationDate,
        note: transaction.note,
        labels: transaction.labels,
        photoUrl: transaction.photoUrl,
      }
    }),
    subscriptions: subscriptionRows.map(
      (subscription): Subscription => ({
        id: subscription.id,
        name: subscription.name,
        categoryId: subscription.categoryId,
        amountMinor: subscription.amountMinor,
        currency: subscription.currency,
        billingDay: subscription.billingDay,
        nextChargeDate: subscription.nextChargeDate,
        billingFrequency: subscription.billingFrequency,
        status: subscription.status,
        autoCreateTransactions: subscription.autoCreateTransactions,
        notes: subscription.notes,
      }),
    ),
    wishlistItems: wishlistRows.map(
      (item): WishlistItem => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        url: item.url,
        plannedDate: item.plannedDate,
        isBought: item.isBought,
        amountMinor: item.amountMinor,
        currency: item.currency,
        categoryId: item.categoryId,
        boughtTransactionId: item.boughtTransactionId,
      }),
    ),
    exchangeRates: Object.entries(ratesMap).map(
      ([quoteCurrency, rate]): ExchangeRateEntry => ({
        baseCurrency: 'USD',
        quoteCurrency,
        rate,
      }),
    ),
  }
}

export async function createTransaction(
  user: AuthUser,
  input: z.infer<typeof transactionInput>,
): Promise<Transaction> {
  const database = assertDatabase()
  const dashboard = await getDashboard(user)
  const category = dashboard.categories.find(
    (item) => item.id === input.categoryId,
  )

  const [created] = await database
    .insert(transactionsTable)
    .values({
      userId: user.id,
      categoryId: input.categoryId,
      type: input.type,
      amountMinor: Math.round(input.amount * 100),
      currency: input.currency.toUpperCase(),
      operationDate: input.operationDate,
      note: input.note,
      labels: input.labels,
      photoUrl: input.photoUrl || null,
    })
    .returning()

  if (input.labels.length > 0) {
    await syncLabels(user.id, input.labels)
  }

  return {
    id: created.id,
    type: created.type,
    categoryId: created.categoryId ?? '',
    categoryName: category?.name ?? 'Uncategorized',
    categoryIcon: category?.icon ?? '•',
    amountMinor: created.amountMinor,
    currency: created.currency,
    operationDate: created.operationDate,
    note: created.note,
    labels: created.labels,
    photoUrl: created.photoUrl,
  }
}

export async function createCategory(
  user: AuthUser,
  input: z.infer<typeof categoryInput>,
): Promise<Category> {
  const database = assertDatabase()
  await ensureUserWorkspace(user)

  const [created] = await database
    .insert(categoriesTable)
    .values({
      userId: user.id,
      name: input.name.trim(),
      icon: input.icon,
      type: input.type,
      color: input.color ?? '#64748b',
    })
    .returning()

  return {
    id: created.id,
    name: created.name,
    icon: created.icon,
    type: created.type,
    color: created.color,
  }
}

export async function createSubscription(
  user: AuthUser,
  input: z.infer<typeof subscriptionInput>,
): Promise<Subscription> {
  const database = assertDatabase()
  await ensureUserWorkspace(user)

    const [created] = await database
    .insert(subscriptionsTable)
    .values({
      userId: user.id,
      name: input.name,
      categoryId: input.categoryId,
      amountMinor: Math.round(input.amount * 100),
      currency: input.currency.toUpperCase(),
      billingDay: input.billingDay ?? new Date(input.nextChargeDate).getDate(),
      nextChargeDate: input.nextChargeDate,
      billingFrequency: input.billingFrequency,
      autoCreateTransactions: input.autoCreateTransactions,
      notes: input.notes,
    })
    .returning()

  return {
    id: created.id,
    name: created.name,
    categoryId: created.categoryId,
    amountMinor: created.amountMinor,
    currency: created.currency,
    billingDay: created.billingDay,
    nextChargeDate: created.nextChargeDate,
    billingFrequency: created.billingFrequency,
    status: created.status,
    autoCreateTransactions: created.autoCreateTransactions,
    notes: created.notes,
  }
}

async function syncLabels(userId: string, labelNames: string[]) {
  const database = assertDatabase()

  for (const name of labelNames) {
    await database
      .insert(labelsTable)
      .values({ userId, name })
      .onConflictDoNothing({ target: [labelsTable.userId, labelsTable.name] })
  }
}

export async function createLabel(
  user: AuthUser,
  input: z.infer<typeof labelInput>,
): Promise<Label> {
  const database = assertDatabase()

  const [created] = await database
    .insert(labelsTable)
    .values({ userId: user.id, name: input.name.trim() })
    .returning()

  return { id: created.id, name: created.name }
}

export async function deleteLabel(user: AuthUser, labelId: string) {
  const database = assertDatabase()

  await database
    .delete(labelsTable)
    .where(
      and(eq(labelsTable.id, labelId), eq(labelsTable.userId, user.id)),
    )
}

export async function updateProfile(
  user: AuthUser,
  input: z.infer<typeof profileInput>,
): Promise<Profile> {
  const database = assertDatabase()

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (input.defaultCurrency) {
    values.defaultCurrency = input.defaultCurrency.toUpperCase()
  }
  if (input.displayName !== undefined) {
    values.displayName = input.displayName
  }

  const [updated] = await database
    .update(profilesTable)
    .set(values)
    .where(eq(profilesTable.id, user.id))
    .returning()

  return {
    email: updated.email,
    displayName: updated.displayName,
    defaultCurrency: updated.defaultCurrency,
  }
}

/**
 * Advance a billing date by the given frequency, clamping to the last valid
 * day of the resulting month. Without clamping, JS's setMonth rolls over:
 *   Jan 31 + 1 month → Feb 31 → Mar 3 (skips February entirely).
 */
function getNextBillingDate(
  currentDateStr: string,
  billingFrequency: 'monthly' | 'yearly',
): string {
  const date = new Date(currentDateStr)
  const originalDay = date.getDate()

  if (billingFrequency === 'yearly') {
    date.setFullYear(date.getFullYear() + 1)
  } else {
    date.setMonth(date.getMonth() + 1)
  }

  // If the day rolled over (e.g. Jan 31 → Mar 3 instead of Feb 28),
  // clamp to the last valid day of the target month.
  if (date.getDate() !== originalDay) {
    date.setDate(0)
  }

  return date.toISOString().slice(0, 10)
}

export async function processSubscriptions(user: AuthUser) {
  const database = assertDatabase()
  const today = new Date().toISOString().slice(0, 10)

  const due = await database
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, user.id),
        eq(subscriptionsTable.status, 'active'),
        eq(subscriptionsTable.autoCreateTransactions, true),
        lte(subscriptionsTable.nextChargeDate, today),
      ),
    )

  for (const subscription of due) {
    await database.insert(transactionsTable).values({
      userId: user.id,
      categoryId: subscription.categoryId,
      subscriptionId: subscription.id,
      type: 'expense',
      amountMinor: subscription.amountMinor,
      currency: subscription.currency,
      operationDate: today,
      note: subscription.notes ?? `${subscription.name} (auto)`,

      labels: [],
    })

    const nextDateStr = getNextBillingDate(
      subscription.nextChargeDate,
      subscription.billingFrequency,
    )

    await database
      .update(subscriptionsTable)
      .set({ nextChargeDate: nextDateStr, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, subscription.id))
  }
}

export async function processAllSubscriptions() {
  const database = assertDatabase()
  const today = new Date().toISOString().slice(0, 10)

  const due = await database
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.status, 'active'),
        eq(subscriptionsTable.autoCreateTransactions, true),
        lte(subscriptionsTable.nextChargeDate, today),
      ),
    )

  let processed = 0

  for (const subscription of due) {
    await database.insert(transactionsTable).values({
      userId: subscription.userId,
      categoryId: subscription.categoryId,
      subscriptionId: subscription.id,
      type: 'expense',
      amountMinor: subscription.amountMinor,
      currency: subscription.currency,
      operationDate: today,
      note: subscription.notes ?? `${subscription.name} (auto)`,
      labels: [],
    })

    const nextDateStr = getNextBillingDate(
      subscription.nextChargeDate,
      subscription.billingFrequency,
    )

    await database
      .update(subscriptionsTable)
      .set({ nextChargeDate: nextDateStr, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, subscription.id))

    processed++
  }

  return { processed }
}

export async function updateTransaction(
  user: AuthUser,
  input: z.infer<typeof transactionUpdate>,
): Promise<Transaction> {
  const database = assertDatabase()
  const [existing] = await database
    .select()
    .from(transactionsTable)
    .where(
      and(eq(transactionsTable.id, input.id), eq(transactionsTable.userId, user.id)),
    )
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!existing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
  }

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (input.type) values.type = input.type
  if (input.categoryId) values.categoryId = input.categoryId
  if (input.amount) values.amountMinor = Math.round(input.amount * 100)
  if (input.currency) values.currency = input.currency.toUpperCase()
  if (input.operationDate) values.operationDate = input.operationDate
  if (input.note !== undefined) values.note = input.note
  if (input.labels) values.labels = input.labels
  if (input.photoUrl !== undefined) values.photoUrl = input.photoUrl || null

  const [updated] = await database
    .update(transactionsTable)
    .set(values)
    .where(eq(transactionsTable.id, input.id))
    .returning()

  // Sync new labels to the labels table
  if (input.labels && input.labels.length > 0) {
    await syncLabels(user.id, input.labels)
  }

  const dashboard = await getDashboard(user)
  const category = dashboard.categories.find((c) => c.id === updated.categoryId)

  return {
    id: updated.id,
    type: updated.type,
    categoryId: updated.categoryId ?? '',
    categoryName: category?.name ?? 'Uncategorized',
    categoryIcon: category?.icon ?? '•',
    amountMinor: updated.amountMinor,
    currency: updated.currency,
    operationDate: updated.operationDate,
    note: updated.note,
    labels: updated.labels,
    photoUrl: updated.photoUrl,
  }
}

export async function deleteTransaction(user: AuthUser, transactionId: string) {
  const database = assertDatabase()

  await database
    .delete(transactionsTable)
    .where(
      and(eq(transactionsTable.id, transactionId), eq(transactionsTable.userId, user.id)),
    )
}

export async function updateSubscription(
  user: AuthUser,
  input: z.infer<typeof subscriptionUpdate>,
): Promise<Subscription> {
  const database = assertDatabase()

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (input.name) values.name = input.name
  if (input.categoryId !== undefined) values.categoryId = input.categoryId
  if (input.amount) values.amountMinor = Math.round(input.amount * 100)
  if (input.currency) values.currency = input.currency.toUpperCase()
  if (input.billingDay) values.billingDay = input.billingDay
  if (input.nextChargeDate) values.nextChargeDate = input.nextChargeDate
  if (input.billingFrequency) values.billingFrequency = input.billingFrequency
  if (input.autoCreateTransactions !== undefined) values.autoCreateTransactions = input.autoCreateTransactions
  if (input.notes !== undefined) values.notes = input.notes

  const query = await database
    .update(subscriptionsTable)
    .set(values)
    .where(
      and(eq(subscriptionsTable.id, input.id), eq(subscriptionsTable.userId, user.id)),
    )
    .returning()

  if (query.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found' })
  }

  const [updated] = query

  return {
    id: updated.id,
    name: updated.name,
    categoryId: updated.categoryId,
    amountMinor: updated.amountMinor,
    currency: updated.currency,
    billingDay: updated.billingDay,
    nextChargeDate: updated.nextChargeDate,
    billingFrequency: updated.billingFrequency,
    status: updated.status,
    autoCreateTransactions: updated.autoCreateTransactions,
    notes: updated.notes,
  }
}

export async function deleteSubscription(user: AuthUser, subscriptionId: string) {
  const database = assertDatabase()

  await database
    .delete(subscriptionsTable)
    .where(
      and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.userId, user.id)),
    )
}

function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const plaintext = `ft_${randomBytes(24).toString('base64url')}`
  const hash = createHash('sha256').update(plaintext).digest('hex')
  const prefix = plaintext.slice(0, 10)
  return { plaintext, hash, prefix }
}

export async function getApiKeyInfo(
  user: AuthUser,
): Promise<{ prefix: string | null; createdAt: Date | null }> {
  const database = assertDatabase()
  const rows = await database
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, user.id))
    .limit(1)

  const row = rows[0]

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return row
    ? { prefix: row.keyPrefix, createdAt: row.createdAt }
    : { prefix: null, createdAt: null }
}

export async function regenerateApiKey(
  user: AuthUser,
): Promise<{ apiKey: string; prefix: string }> {
  const database = assertDatabase()
  const { plaintext, hash, prefix } = generateApiKey()

  await database
    .delete(apiKeysTable)
    .where(eq(apiKeysTable.userId, user.id))

  await database.insert(apiKeysTable).values({
    userId: user.id,
    keyHash: hash,
    keyPrefix: prefix,
  })

  return { apiKey: plaintext, prefix }
}

export async function revokeApiKey(user: AuthUser) {
  const database = assertDatabase()
  await database
    .delete(apiKeysTable)
    .where(eq(apiKeysTable.userId, user.id))
}

export async function createWishlistItem(
  user: AuthUser,
  input: z.infer<typeof wishlistItemInput>,
): Promise<WishlistItem> {
  const database = assertDatabase()

  const [created] = await database
    .insert(wishlistItemsTable)
    .values({
      userId: user.id,
      title: input.title,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      url: input.url || null,
      plannedDate: input.plannedDate || null,
      amountMinor: input.amount ? Math.round(input.amount * 100) : null,
      currency: input.currency?.toUpperCase() || null,
      categoryId: input.categoryId || null,
    })
    .returning()

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    imageUrl: created.imageUrl,
    url: created.url,
    plannedDate: created.plannedDate,
    isBought: created.isBought,
    amountMinor: created.amountMinor,
    currency: created.currency,
    categoryId: created.categoryId,
    boughtTransactionId: created.boughtTransactionId,
  }
}

export async function updateWishlistItem(
  user: AuthUser,
  input: z.infer<typeof wishlistItemUpdate>,
): Promise<{ item: WishlistItem; transaction?: Transaction; deletedTransactionId?: string }> {
  const database = assertDatabase()

  // Fetch existing item to check boughtTransactionId before unmarking
  const [existing] = await database
    .select()
    .from(wishlistItemsTable)
    .where(
      and(eq(wishlistItemsTable.id, input.id), eq(wishlistItemsTable.userId, user.id)),
    )
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!existing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Wishlist item not found' })
  }

  let deletedTransactionId: string | undefined

  // If unmarking as bought, delete the linked transaction
  if (input.isBought === false && existing.boughtTransactionId) {
    await database
      .delete(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, existing.boughtTransactionId),
          eq(transactionsTable.userId, user.id),
        ),
      )
    deletedTransactionId = existing.boughtTransactionId
  }

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (input.title !== undefined) values.title = input.title
  if (input.description !== undefined) values.description = input.description || null
  if (input.imageUrl !== undefined) values.imageUrl = input.imageUrl || null
  if (input.url !== undefined) values.url = input.url || null
  if (input.plannedDate !== undefined) values.plannedDate = input.plannedDate || null
  if (input.isBought !== undefined) values.isBought = input.isBought
  if (input.amount !== undefined) values.amountMinor = Math.round(input.amount * 100)
  if (input.currency !== undefined) values.currency = input.currency.toUpperCase()
  if (input.categoryId !== undefined) values.categoryId = input.categoryId || null

  // If unmarking, clear the boughtTransactionId
  if (input.isBought === false && existing.boughtTransactionId) {
    values.boughtTransactionId = null
  }

  const [updated] = await database
    .update(wishlistItemsTable)
    .set(values)
    .where(
      and(eq(wishlistItemsTable.id, input.id), eq(wishlistItemsTable.userId, user.id)),
    )
    .returning()

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!updated) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Wishlist item not found' })
  }

  let transaction: Transaction | undefined

  // If marked as bought and user wants to create a transaction
  if (input.createTransaction && input.isBought && updated.amountMinor && updated.currency) {
    const today = new Date().toISOString().slice(0, 10)
    const categoryRows = await database
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.userId, user.id),
          ...(updated.categoryId ? [eq(categoriesTable.id, updated.categoryId)] : []),
        ),
      )
      .limit(1)

    const category = categoryRows[0]

    const [createdTx] = await database
      .insert(transactionsTable)
      .values({
        userId: user.id,
        categoryId: updated.categoryId ?? null,
        type: 'expense',
        amountMinor: updated.amountMinor,
        currency: updated.currency,
        operationDate: today,
        note: updated.title,
        labels: [],
      })
      .returning()

    // Link the transaction to the wishlist item
    await database
      .update(wishlistItemsTable)
      .set({ boughtTransactionId: createdTx.id, updatedAt: new Date() })
      .where(eq(wishlistItemsTable.id, updated.id))

    transaction = {
      id: createdTx.id,
      type: createdTx.type,
      categoryId: createdTx.categoryId ?? '',
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      categoryName: category?.name ?? 'Uncategorized',
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      categoryIcon: category?.icon ?? '•',
      amountMinor: createdTx.amountMinor,
      currency: createdTx.currency,
      operationDate: createdTx.operationDate,
      note: createdTx.note,
      labels: createdTx.labels,
      photoUrl: createdTx.photoUrl,
    }
  }

  return {
    item: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      imageUrl: updated.imageUrl,
      url: updated.url,
      plannedDate: updated.plannedDate,
      isBought: updated.isBought,
      amountMinor: updated.amountMinor,
      currency: updated.currency,
      categoryId: updated.categoryId,
      boughtTransactionId: updated.boughtTransactionId,
    },
    transaction,
    deletedTransactionId,
  }
}

export async function deleteWishlistItem(user: AuthUser, itemId: string) {
  const database = assertDatabase()

  await database
    .delete(wishlistItemsTable)
    .where(
      and(eq(wishlistItemsTable.id, itemId), eq(wishlistItemsTable.userId, user.id)),
    )
}

async function computeBudgetSpending(
  database: ReturnType<typeof assertDatabase>,
  userId: string,
  budget: { categoryId: string; startDate: string },
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const rows = await database
    .select({ spent: sum(transactionsTable.amountMinor) })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.categoryId, budget.categoryId),
        eq(transactionsTable.type, 'expense'),
        gte(transactionsTable.operationDate, budget.startDate),
        lte(transactionsTable.operationDate, today),
      ),
    )
  return Number(rows[0]?.spent ?? 0)
}

export async function createBudget(
  user: AuthUser,
  input: z.infer<typeof budgetInput>,
): Promise<Budget> {
  const database = assertDatabase()

  const [category] = await database
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, input.categoryId),
        eq(categoriesTable.userId, user.id),
      ),
    )
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!category) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' })
  }

  const [created] = await database
    .insert(budgetsTable)
    .values({
      userId: user.id,
      categoryId: input.categoryId,
      amountLimit: Math.round(input.amountLimit * 100),
      period: input.period,
      startDate: input.startDate,
    })
    .returning()

  return {
    id: created.id,
    categoryId: created.categoryId,
    categoryName: category.name,
    categoryIcon: category.icon,
    amountLimit: created.amountLimit,
    period: created.period as 'monthly' | 'yearly',
    startDate: created.startDate,
  }
}

export async function getBudgets(user: AuthUser): Promise<BudgetWithSpending[]> {
  const database = assertDatabase()

  const budgetRows = await database
    .select()
    .from(budgetsTable)
    .where(eq(budgetsTable.userId, user.id))

  if (budgetRows.length === 0) return []

  const categoryIds = budgetRows.map((b) => b.categoryId)
  const categoryRows = await database
    .select()
    .from(categoriesTable)
    .where(inArray(categoriesTable.id, categoryIds))

  const categoryMap = new Map(categoryRows.map((c) => [c.id, c]))

  return Promise.all(
    budgetRows.map(async (budget): Promise<BudgetWithSpending> => {
      const category = categoryMap.get(budget.categoryId)
      const spent = await computeBudgetSpending(database, user.id, budget)
      const percentage =
        budget.amountLimit > 0
          ? Math.min(100, Math.round((spent / budget.amountLimit) * 100))
          : 0

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: category?.name ?? 'Unknown',
        categoryIcon: category?.icon ?? '•',
        amountLimit: budget.amountLimit,
        period: budget.period as 'monthly' | 'yearly',
        startDate: budget.startDate,
        spent,
        percentage,
      }
    }),
  )
}

export async function updateBudget(
  user: AuthUser,
  input: z.infer<typeof budgetUpdate>,
): Promise<BudgetWithSpending> {
  const database = assertDatabase()

  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (input.amountLimit !== undefined) {
    values.amountLimit = Math.round(input.amountLimit * 100)
  }
  if (input.period !== undefined) values.period = input.period
  if (input.startDate !== undefined) values.startDate = input.startDate

  const query = await database
    .update(budgetsTable)
    .set(values)
    .where(
      and(eq(budgetsTable.id, input.id), eq(budgetsTable.userId, user.id)),
    )
    .returning()

  if (query.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget not found' })
  }

  const [updated] = query

  const [categoryRow] = await database
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, updated.categoryId))
    .limit(1)

  const spent = await computeBudgetSpending(database, user.id, updated)
  const percentage =
    updated.amountLimit > 0
      ? Math.min(100, Math.round((spent / updated.amountLimit) * 100))
      : 0

  return {
    id: updated.id,
    categoryId: updated.categoryId,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    categoryName: categoryRow?.name ?? 'Unknown',
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    categoryIcon: categoryRow?.icon ?? '•',
    amountLimit: updated.amountLimit,
    period: updated.period as 'monthly' | 'yearly',
    startDate: updated.startDate,
    spent,
    percentage,
  }
}

export async function deleteBudget(user: AuthUser, budgetId: string) {
  const database = assertDatabase()

  await database
    .delete(budgetsTable)
    .where(
      and(eq(budgetsTable.id, budgetId), eq(budgetsTable.userId, user.id)),
    )
}

export async function validateApiKey(apiKey: string): Promise<AuthUser | null> {
  if (!apiKey.startsWith('ft_')) return null

  const database = assertDatabase()
  const hash = createHash('sha256').update(apiKey).digest('hex')

  const rows = await database
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.keyHash, hash))
    .limit(1)

  const row = rows[0]

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!row) return null

  await database
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, row.id))

  const profiles = await database
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, row.userId))
    .limit(1)

  const profile = profiles[0]

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!profile) return null

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
  }
}
