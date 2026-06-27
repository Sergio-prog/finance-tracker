import { desc, eq, gt } from 'drizzle-orm'

import { db, hasDatabase } from './db/client'
import { exchangeRates as exchangeRatesTable } from './db/schema'

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2/rates'
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours

export type ExchangeRateMap = Record<string, number>

/**
 * Fetch latest rates from Frankfurter v2 (free, no API key).
 * Returns a map of quoteCurrency → rate (1 base = X quote).
 */
export async function fetchLatestRates(
  baseCurrency: string = 'USD',
): Promise<ExchangeRateMap> {
  const response = await fetch(
    `${FRANKFURTER_URL}?base=${baseCurrency}`,
  )
  if (!response.ok) {
    throw new Error(`Frankfurter API returned ${response.status}`)
  }
  // v2 returns an array of { date, base, quote, rate } objects
  const rows = (await response.json()) as Array<{
    date: string
    base: string
    quote: string
    rate: number
  }>
  const map: ExchangeRateMap = {}
  for (const row of rows) {
    map[row.quote] = row.rate
  }
  return map
}

/** Store fetched rates into the exchange_rates table. */
export async function storeExchangeRates(
  baseCurrency: string,
  rates: ExchangeRateMap,
): Promise<void> {
  if (!hasDatabase || !db) return

  const now = new Date()
  for (const [quoteCurrency, rate] of Object.entries(rates)) {
    await db
      .insert(exchangeRatesTable)
      .values({
        baseCurrency,
        quoteCurrency,
        rate: String(rate),
        capturedAt: now,
      })
  }
}

/**
 * Get cached exchange rates. Returns only the latest row per quote currency.
 */
export async function getExchangeRates(
  baseCurrency: string = 'USD',
): Promise<ExchangeRateMap> {
  if (!hasDatabase || !db) return {}

  const rows = await db
    .select()
    .from(exchangeRatesTable)
    .where(eq(exchangeRatesTable.baseCurrency, baseCurrency))
    .orderBy(desc(exchangeRatesTable.capturedAt))

  const latest = new Map<string, number>()
  for (const row of rows) {
    if (!latest.has(row.quoteCurrency)) {
      latest.set(row.quoteCurrency, Number(row.rate))
    }
  }

  return Object.fromEntries(latest)
}

/** Check if cached rates are older than 24h. */
async function areRatesStale(): Promise<boolean> {
  if (!hasDatabase || !db) return true

  const threshold = new Date(Date.now() - STALE_THRESHOLD_MS)
  const rows = await db
    .select()
    .from(exchangeRatesTable)
    .where(gt(exchangeRatesTable.capturedAt, threshold))
    .limit(1)

  return rows.length === 0
}

/**
 * Refresh exchange rates if stale, then return the latest rates.
 * Safe to call on every dashboard load — no-op when rates are fresh.
 */
export async function ensureFreshRates(): Promise<ExchangeRateMap> {
  if (await areRatesStale()) {
    await refreshExchangeRates()
  }
  return getExchangeRates()
}

/** Force-refresh rates from the external API. Returns count of pairs stored. */
export async function refreshExchangeRates(): Promise<{ refreshed: number }> {
  try {
    const rates = await fetchLatestRates('USD')
    await storeExchangeRates('USD', rates)
    return { refreshed: Object.keys(rates).length }
  } catch (error) {
    console.error('[exchange-rates] Failed to refresh:', error)
    return { refreshed: 0 }
  }
}

/**
 * Convert an amount in minor units from one currency to another.
 * Returns null if either currency's rate is unknown.
 * All rates are relative to USD: 1 USD = rate units of that currency.
 */
export function convertAmount(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRateMap,
): number | null {
  if (fromCurrency === toCurrency) return amountMinor

  const fromRate = rates[fromCurrency]
  const toRate = rates[toCurrency]

  if (!fromRate || !toRate) return null

  // FROM → USD → TO
  return Math.round(amountMinor * (toRate / fromRate))
}

/** Get the exchange rate factor between two currencies (to/from). */
export function getRate(
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRateMap,
): number | null {
  if (fromCurrency === toCurrency) return 1

  const fromRate = rates[fromCurrency]
  const toRate = rates[toCurrency]

  if (!fromRate || !toRate) return null

  return toRate / fromRate
}
