import { TRPCError, initTRPC } from '@trpc/server'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

import { getAuthUser } from '@/server/auth'

import {
  createCategory,
  createSubscription,
  createTransaction,
  getDashboard,
} from './repository'
import {
  categoryInput,
  subscriptionInput,
  transactionInput,
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
})

export type AppRouter = typeof appRouter
