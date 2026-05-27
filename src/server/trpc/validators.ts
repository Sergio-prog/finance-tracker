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
  billingDay: z.coerce.number().int().min(1).max(31),
  nextChargeDate: z.string().min(10),
  autoCreateTransactions: z.boolean().default(true),
  notes: z.string().max(280).optional(),
})

export const categoryInput = z.object({
  name: z.string().min(2).max(40),
  icon: z.string().min(1).max(8),
  type: z.enum(['expense', 'income']),
  color: z.string().min(3).max(24).optional(),
})
