export type OperationType = 'expense' | 'income'
export type Period = 'day' | 'week' | 'month' | 'year'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'

export type Category = {
  id: string
  name: string
  icon: string
  type: OperationType
  color: string
}

export type Transaction = {
  id: string
  type: OperationType
  categoryId: string
  categoryName: string
  categoryIcon: string
  amountMinor: number
  currency: string
  operationDate: string
  note: string | null
  labels: string[]
  photoUrl?: string | null
}

export type Subscription = {
  id: string
  name: string
  categoryId: string | null
  amountMinor: number
  currency: string
  billingDay: number
  nextChargeDate: string
  status: SubscriptionStatus
  autoCreateTransactions: boolean
  notes?: string | null
}

export type ChartPoint = {
  label: string
  spent: number
  gained: number
}

export type DashboardData = {
  categories: Category[]
  transactions: Transaction[]
  subscriptions: Subscription[]
}
