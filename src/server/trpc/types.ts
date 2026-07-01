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

export type BillingFrequency = 'monthly' | 'yearly'

export type Subscription = {
  id: string
  name: string
  categoryId: string | null
  amountMinor: number
  currency: string
  billingDay: number
  nextChargeDate: string
  billingFrequency: BillingFrequency
  status: SubscriptionStatus
  autoCreateTransactions: boolean
  notes?: string | null
}

export type Label = {
  id: string
  name: string
}

export type WishlistItem = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  url: string | null
  plannedDate: string | null
  isBought: boolean
  amountMinor: number | null
  currency: string | null
  categoryId: string | null
  boughtTransactionId: string | null
}

export type Profile = {
  email: string
  displayName: string | null
  defaultCurrency: string
}

export type ChartPoint = {
  label: string
  spent: number
  gained: number
}

export type ExchangeRateEntry = {
  baseCurrency: string
  quoteCurrency: string
  rate: number
}

export type Budget = {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  amountLimit: number
  period: 'monthly' | 'yearly'
  startDate: string
}

export type BudgetWithSpending = Budget & {
  spent: number
  percentage: number
}

export type DashboardData = {
  profile: Profile
  categories: Category[]
  transactions: Transaction[]
  subscriptions: Subscription[]
  labels: Label[]
  wishlistItems: WishlistItem[]
  exchangeRates: ExchangeRateEntry[]
}
