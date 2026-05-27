import { useEffect, useMemo, useState } from 'react'

import type {
  Category,
  DashboardData,
  Subscription,
  Transaction,
} from '@/server/trpc/types'
import { supabase } from '@/lib/supabase'
import { trpc } from '@/trpc/client'

export function useFinanceData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const dashboard = await trpc.dashboard.query()
        if (isMounted) setData(dashboard)
      } catch (cause) {
        if (isMounted) {
          setData(null)
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
    }),
    [],
  )

  return {
    categories: data?.categories ?? ([] as Category[]),
    transactions: data?.transactions ?? ([] as Transaction[]),
    subscriptions: data?.subscriptions ?? ([] as Subscription[]),
    isLoading,
    error,
    ...actions,
  }
}
