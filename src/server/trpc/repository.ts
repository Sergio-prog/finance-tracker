import { and, desc, eq, lte } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

import { db, hasDatabase } from '../db/client'
import {
  billingFrequency as billingFrequencyEnum,
  categories as categoriesTable,
  labels as labelsTable,
  profiles as profilesTable,
  subscriptions as subscriptionsTable,
  transactions as transactionsTable,
} from '../db/schema'
import type { AuthUser } from '../auth'
import type {
  Category,
  DashboardData,
  Label,
  Profile,
  Subscription,
  Transaction,
} from './types'
import type {
  categoryInput,
  labelInput,
  profileInput,
  subscriptionInput,
  subscriptionUpdate,
  transactionInput,
  transactionUpdate,
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

  const categoryRows = await database
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, user.id))

  const categoryMap = new Map(categoryRows.map((c) => [c.id, c]))

  for (const subscription of due) {
    const category = subscription.categoryId
      ? categoryMap.get(subscription.categoryId)
      : undefined

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

    const nextDate = new Date(subscription.nextChargeDate)
    if (subscription.billingFrequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1)
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
    const nextDateStr = nextDate.toISOString().slice(0, 10)

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

    const nextDate = new Date(subscription.nextChargeDate)
    if (subscription.billingFrequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1)
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
    const nextDateStr = nextDate.toISOString().slice(0, 10)

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
