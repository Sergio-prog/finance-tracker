import { getCurrencySymbol } from './currency'
import type { ExchangeRateEntry } from '@/server/trpc/types'

function lessThanOneLabel(currency: string): string {
  const symbol = getCurrencySymbol(currency)
  return `<${symbol}1`
}

export function formatMoney(amountMinor: number, currency: string) {
  const abs = Math.abs(amountMinor)
  if (abs > 0 && abs < 100) {
    const sign = amountMinor < 0 ? '-' : ''
    return `${sign}${lessThanOneLabel(currency)}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)
}

export function formatCompactMoney(amountMinor: number, currency: string) {
  const abs = Math.abs(amountMinor)
  if (abs > 0 && abs < 100) {
    const sign = amountMinor < 0 ? '-' : ''
    return `${sign}${lessThanOneLabel(currency)}`
  }

  const symbol = getCurrencySymbol(currency)
  return `${symbol}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)}`
}

export function amountToMinor(amount: FormDataEntryValue | null) {
  return Math.round(Number(amount ?? 0) * 100)
}

/** Build a lookup map from exchange rate entries: quoteCurrency → rate (1 USD = rate). */
export function buildRateMap(rates: ExchangeRateEntry[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const entry of rates) {
    map[entry.quoteCurrency] = entry.rate
  }
  return map
}

/**
 * Convert an amount in minor units from one currency to another.
 * Returns null if rates are unavailable for either currency.
 */
export function convertAmountMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rateMap: Record<string, number>,
): number | null {
  if (fromCurrency === toCurrency) return amountMinor

  const fromRate = rateMap[fromCurrency]
  const toRate = rateMap[toCurrency]

  if (!fromRate || !toRate) return null

  return Math.round(amountMinor * (toRate / fromRate))
}

/** Get the exchange rate factor between two currencies. */
export function getRateFactor(
  fromCurrency: string,
  toCurrency: string,
  rateMap: Record<string, number>,
): number | null {
  if (fromCurrency === toCurrency) return 1

  const fromRate = rateMap[fromCurrency]
  const toRate = rateMap[toCurrency]

  if (!fromRate || !toRate) return null

  return toRate / fromRate
}
