import { desc, eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

import { db, hasDatabase } from '../db/client'
import {
  categories as categoriesTable,
  profiles as profilesTable,
  subscriptions as subscriptionsTable,
  transactions as transactionsTable,
} from '../db/schema'
import type { AuthUser } from '../auth'
import type {
  Category,
  DashboardData,
  Subscription,
  Transaction,
} from './types'
import type {
  categoryInput,
  subscriptionInput,
  transactionInput,
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
] as const

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

  const existingCategories = await database
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, user.id))

  if (existingCategories.length > 0) {
    return existingCategories
  }

  return seedDefaultCategories(user)
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

export async function getDashboard(user: AuthUser): Promise<DashboardData> {
  const database = assertDatabase()

  await ensureUserProfile(user)

  const [loadedCategoryRows, transactionRows, subscriptionRows] =
    await Promise.all([
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
    ])

  const categoryRows =
    loadedCategoryRows.length > 0
      ? loadedCategoryRows
      : await seedDefaultCategories(user)

  const categoryMap = new Map(
    categoryRows.map((category) => [category.id, category]),
  )

  return {
    categories: categoryRows,
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
      billingDay: input.billingDay,
      nextChargeDate: input.nextChargeDate,
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
    status: created.status,
    autoCreateTransactions: created.autoCreateTransactions,
    notes: created.notes,
  }
}
