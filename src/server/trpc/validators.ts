import { z } from 'zod'

export const transactionInput = z.object({
  type: z.enum(['expense', 'income']),
  categoryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3),
  operationDate: z.string().min(10),
  note: z.string().max(280).optional(),
  labels: z.array(z.string().min(1)).default([]),
  photoUrl: z.string().url().optional().or(z.literal('')),
})

export const subscriptionInput = z.object({
  name: z.string().min(2),
  categoryId: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3),
  billingDay: z.coerce.number().int().min(1).max(31).optional(),
  nextChargeDate: z.string().min(10),
  billingFrequency: z.enum(['monthly', 'yearly']).default('monthly'),
  autoCreateTransactions: z.boolean().default(true),
  notes: z.string().max(280).optional(),
})

export const categoryInput = z.object({
  name: z.string().min(2).max(40),
  icon: z.string().min(1).max(8),
  type: z.enum(['expense', 'income']),
  color: z.string().min(3).max(24).optional(),
})

export const transactionUpdate = z.object({
  id: z.string().min(1),
  type: z.enum(['expense', 'income']).optional(),
  categoryId: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  operationDate: z.string().min(10).optional(),
  note: z.string().max(280).optional(),
  labels: z.array(z.string().min(1)).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
})

export const subscriptionUpdate = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  categoryId: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  billingDay: z.coerce.number().int().min(1).max(31).optional(),
  nextChargeDate: z.string().min(10).optional(),
  billingFrequency: z.enum(['monthly', 'yearly']).optional(),
  autoCreateTransactions: z.boolean().optional(),
  notes: z.string().max(280).optional(),
})

export const labelInput = z.object({
  name: z.string().min(1).max(32),
})

export const wishlistItemInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  plannedDate: z.string().min(10).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  categoryId: z.string().min(1).optional(),
})

export const wishlistItemUpdate = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  plannedDate: z.string().min(10).optional(),
  isBought: z.boolean().optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  categoryId: z.string().min(1).optional(),
  createTransaction: z.boolean().optional(),
})

export const profileInput = z.object({
  defaultCurrency: z.string().min(3).max(3).optional(),
  displayName: z.string().max(60).optional(),
})
