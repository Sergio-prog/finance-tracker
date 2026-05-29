import { TRPCError, initTRPC } from '@trpc/server'
import { z } from 'zod'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

import { getAuthUser } from '@/server/auth'

import {
  createCategory,
  createLabel,
  createSubscription,
  createTransaction,
  deleteLabel,
  deleteSubscription,
  deleteTransaction,
  getDashboard,
  processSubscriptions,
  updateProfile,
  updateSubscription,
  updateTransaction,
} from './repository'
import {
  categoryInput,
  labelInput,
  profileInput,
  subscriptionInput,
  subscriptionUpdate,
  transactionInput,
  transactionUpdate,
} from './validators'

export async function createContext({
  req,
  resHeaders,
}: FetchCreateContextFnOptions) {
  return {
    req,
    resHeaders,
    user: await getAuthUser(req.headers.get('authorization')),
  }
}

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create()

const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Sign in with Google to load your finance data.',
    })
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  })
})

export const appRouter = t.router({
  dashboard: authenticatedProcedure.query(({ ctx }) => getDashboard(ctx.user)),
  createTransaction: authenticatedProcedure
    .input(transactionInput)
    .mutation(({ ctx, input }) => createTransaction(ctx.user, input)),
  createCategory: authenticatedProcedure
    .input(categoryInput)
    .mutation(({ ctx, input }) => createCategory(ctx.user, input)),
  createSubscription: authenticatedProcedure
    .input(subscriptionInput)
    .mutation(({ ctx, input }) => createSubscription(ctx.user, input)),
  createLabel: authenticatedProcedure
    .input(labelInput)
    .mutation(({ ctx, input }) => createLabel(ctx.user, input)),
  deleteLabel: authenticatedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => deleteLabel(ctx.user, input.id)),
  updateProfile: authenticatedProcedure
    .input(profileInput)
    .mutation(({ ctx, input }) => updateProfile(ctx.user, input)),
  processSubscriptions: authenticatedProcedure.mutation(({ ctx }) =>
    processSubscriptions(ctx.user),
  ),
  updateTransaction: authenticatedProcedure
    .input(transactionUpdate)
    .mutation(({ ctx, input }) => updateTransaction(ctx.user, input)),
  deleteTransaction: authenticatedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => deleteTransaction(ctx.user, input.id)),
  updateSubscription: authenticatedProcedure
    .input(subscriptionUpdate)
    .mutation(({ ctx, input }) => updateSubscription(ctx.user, input)),
  deleteSubscription: authenticatedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => deleteSubscription(ctx.user, input.id)),
})

export type AppRouter = typeof appRouter
