import { useEffect, useMemo, useState } from 'react'

import type {
  Category,
  DashboardData,
  ExchangeRateEntry,
  Label,
  Subscription,
  Transaction,
  WishlistItem,
} from '@/server/trpc/types'
import { supabase } from '@/lib/supabase'
import { trpc } from '@/trpc/client'

export type ApiKeyInfo = {
  prefix: string | null
  createdAt: string | null
}

export function useFinanceData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const [dashboard, keyInfo] = await Promise.all([
          trpc.dashboard.query(),
          trpc.getApiKey.query().catch(() => ({ prefix: null, createdAt: null })),
        ])
        if (isMounted) {
          setData(dashboard)
          setApiKeyInfo(keyInfo)
        }
      } catch (cause) {
        if (isMounted) {
          setData(null)
          setApiKeyInfo(null)
          setError(cause instanceof Error ? cause.message : 'Load failed')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadDashboard()
    const authSubscription = supabase?.auth.onAuthStateChange(() => {
      loadDashboard()
    })

    return () => {
      isMounted = false
      authSubscription?.data.subscription.unsubscribe()
    }
  }, [])

  const actions = useMemo(
    () => ({
      addTransaction: async (
        input: Parameters<typeof trpc.createTransaction.mutate>[0],
      ) => {
        const created = await trpc.createTransaction.mutate(input)
        setData((current) =>
          current
            ? { ...current, transactions: [created, ...current.transactions] }
            : current,
        )
      },
      updateTransaction: async (
        input: Parameters<typeof trpc.updateTransaction.mutate>[0],
      ) => {
        const updated = await trpc.updateTransaction.mutate(input)
        setData((current) =>
          current
            ? {
                ...current,
                transactions: current.transactions.map((t) =>
                  t.id === updated.id ? updated : t,
                ),
              }
            : current,
        )
      },
      deleteTransaction: async (id: string) => {
        await trpc.deleteTransaction.mutate({ id })
        setData((current) =>
          current
            ? {
                ...current,
                transactions: current.transactions.filter((t) => t.id !== id),
              }
            : current,
        )
      },
      addSubscription: async (
        input: Parameters<typeof trpc.createSubscription.mutate>[0],
      ) => {
        const created = await trpc.createSubscription.mutate(input)
        setData((current) =>
          current
            ? { ...current, subscriptions: [created, ...current.subscriptions] }
            : current,
        )
      },
      updateSubscription: async (
        input: Parameters<typeof trpc.updateSubscription.mutate>[0],
      ) => {
        const updated = await trpc.updateSubscription.mutate(input)
        setData((current) =>
          current
            ? {
                ...current,
                subscriptions: current.subscriptions.map((s) =>
                  s.id === updated.id ? updated : s,
                ),
              }
            : current,
        )
      },
      deleteSubscription: async (id: string) => {
        await trpc.deleteSubscription.mutate({ id })
        setData((current) =>
          current
            ? {
                ...current,
                subscriptions: current.subscriptions.filter((s) => s.id !== id),
              }
            : current,
        )
      },
      addCategory: async (
        input: Parameters<typeof trpc.createCategory.mutate>[0],
      ) => {
        const created = await trpc.createCategory.mutate(input)
        setData((current) =>
          current
            ? { ...current, categories: [...current.categories, created] }
            : current,
        )

        return created
      },
      addLabel: async (
        input: Parameters<typeof trpc.createLabel.mutate>[0],
      ) => {
        const created = await trpc.createLabel.mutate(input)
        setData((current) =>
          current
            ? { ...current, labels: [...current.labels, created] }
            : current,
        )

        return created
      },
      removeLabel: async (
        input: Parameters<typeof trpc.deleteLabel.mutate>[0],
      ) => {
        await trpc.deleteLabel.mutate(input)
        setData((current) =>
          current
            ? {
                ...current,
                labels: current.labels.filter((l) => l.id !== input.id),
              }
            : current,
        )
      },
      saveProfile: async (
        input: Parameters<typeof trpc.updateProfile.mutate>[0],
      ) => {
        const updated = await trpc.updateProfile.mutate(input)
        setData((current) =>
          current ? { ...current, profile: updated } : current,
        )
      },
      regenerateApiKey: async () => {
        const result = await trpc.regenerateApiKey.mutate()
        const info = await trpc.getApiKey.query()
        setApiKeyInfo(info)
        return result
      },
      revokeApiKey: async () => {
        await trpc.revokeApiKey.mutate()
        setApiKeyInfo({ prefix: null, createdAt: null })
      },
      createWishlistItem: async (
        input: Parameters<typeof trpc.createWishlistItem.mutate>[0],
      ) => {
        const created = await trpc.createWishlistItem.mutate(input)
        setData((current) =>
          current
            ? {
                ...current,
                wishlistItems: [created, ...current.wishlistItems],
              }
            : current,
        )
      },
      updateWishlistItem: async (
        input: Parameters<typeof trpc.updateWishlistItem.mutate>[0],
      ) => {
        const result = await trpc.updateWishlistItem.mutate(input)
        setData((current) => {
          if (!current) return current
          let nextTransactions = current.transactions
          if (result.transaction) {
            nextTransactions = [result.transaction, ...nextTransactions]
          }
          if (result.deletedTransactionId) {
            nextTransactions = nextTransactions.filter(
              (t) => t.id !== result.deletedTransactionId,
            )
          }
          return {
            ...current,
            wishlistItems: current.wishlistItems.map((w) =>
              w.id === result.item.id ? result.item : w,
            ),
            transactions: nextTransactions,
          }
        })
      },
      deleteWishlistItem: async (id: string) => {
        await trpc.deleteWishlistItem.mutate({ id })
        setData((current) =>
          current
            ? {
                ...current,
                wishlistItems: current.wishlistItems.filter((w) => w.id !== id),
              }
            : current,
        )
      },
    }),
    [],
  )

  return {
    profile: data?.profile ?? { email: '', displayName: null, defaultCurrency: 'USD' },
    categories: data?.categories ?? ([] as Category[]),
    transactions: data?.transactions ?? ([] as Transaction[]),
    subscriptions: data?.subscriptions ?? ([] as Subscription[]),
    labels: data?.labels ?? ([] as Label[]),
    wishlistItems: data?.wishlistItems ?? ([] as WishlistItem[]),
    exchangeRates: data?.exchangeRates ?? ([] as ExchangeRateEntry[]),
    apiKeyInfo,
    isLoading,
    error,
    ...actions,
  }
}
