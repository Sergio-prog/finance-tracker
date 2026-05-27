import { getCurrencySymbol } from './currency'

export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)
}

export function formatCompactMoney(amountMinor: number, currency: string) {
  return `${getCurrencySymbol(currency)}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)}`
}

export function amountToMinor(amount: FormDataEntryValue | null) {
  return Math.round(Number(amount ?? 0) * 100)
}
