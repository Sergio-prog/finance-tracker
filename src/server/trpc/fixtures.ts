import { addDays, format, startOfMonth, subDays, subMonths } from 'date-fns'

import type {
  Category,
  DashboardData,
  Subscription,
  Transaction,
} from './types'

export const categories: Category[] = [
  { id: 'food', name: 'Food', icon: '🍜', type: 'expense', color: '#9f5f2c' },
  { id: 'home', name: 'Home', icon: '🏠', type: 'expense', color: '#525252' },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚕',
    type: 'expense',
    color: '#7c6f4f',
  },
  {
    id: 'health',
    name: 'Health',
    icon: '🫀',
    type: 'expense',
    color: '#8a3d3d',
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '🏝️',
    type: 'expense',
    color: '#2f6f73',
  },
  {
    id: 'salary',
    name: 'Salary',
    icon: '💼',
    type: 'income',
    color: '#34785f',
  },
  {
    id: 'side',
    name: 'Side profit',
    icon: '🧾',
    type: 'income',
    color: '#4d6f9f',
  },
]

const today = new Date()

export const transactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'expense',
    categoryId: 'food',
    categoryName: 'Food',
    categoryIcon: '🍜',
    amountMinor: 1840,
    currency: 'USD',
    operationDate: format(subDays(today, 1), 'yyyy-MM-dd'),
    note: 'Lunch near office',
    labels: ['Must haves'],
  },
  {
    id: 'tx-2',
    type: 'income',
    categoryId: 'salary',
    categoryName: 'Salary',
    categoryIcon: '💼',
    amountMinor: 420000,
    currency: 'USD',
    operationDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    note: 'Monthly salary',
    labels: ['Main'],
  },
  {
    id: 'tx-3',
    type: 'expense',
    categoryId: 'travel',
    categoryName: 'Travel',
    categoryIcon: '🏝️',
    amountMinor: 6400,
    currency: 'USD',
    operationDate: format(subDays(today, 4), 'yyyy-MM-dd'),
    note: 'Train tickets',
    labels: ['🏝️ vacation'],
  },
  {
    id: 'tx-4',
    type: 'expense',
    categoryId: 'home',
    categoryName: 'Home',
    categoryIcon: '🏠',
    amountMinor: 9200,
    currency: 'USD',
    operationDate: format(subMonths(today, 1), 'yyyy-MM-dd'),
    note: 'Utilities',
    labels: ['Must haves'],
  },
]

export const subscriptions: Subscription[] = [
  {
    id: 'sub-1',
    name: 'Spotify',
    categoryId: 'food',
    amountMinor: 1099,
    currency: 'USD',
    billingDay: 12,
    nextChargeDate: format(addDays(today, 6), 'yyyy-MM-dd'),
    status: 'active',
    autoCreateTransactions: true,
  },
  {
    id: 'sub-2',
    name: 'OpenAI',
    categoryId: 'side',
    amountMinor: 2000,
    currency: 'USD',
    billingDay: 18,
    nextChargeDate: format(addDays(today, 12), 'yyyy-MM-dd'),
    status: 'active',
    autoCreateTransactions: true,
  },
  {
    id: 'sub-3',
    name: 'Vercel',
    categoryId: 'home',
    amountMinor: 2000,
    currency: 'USD',
    billingDay: 2,
    nextChargeDate: format(addDays(today, 26), 'yyyy-MM-dd'),
    status: 'paused',
    autoCreateTransactions: false,
  },
]

export const dashboardData: DashboardData = {
  categories,
  transactions,
  subscriptions,
}
