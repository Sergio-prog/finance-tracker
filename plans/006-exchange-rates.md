# Plan 006: Add multi-currency exchange rate auto-fetch

> **Executor instructions**: This is a **design/spike plan** — it produces a
> working prototype with open questions logged. Not a production build plan.
> Run every verification command before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise.
> When done, update the status row for this plan in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat d3d7ba8..HEAD -- src/server/db/schema.ts src/server/aggregations.ts src/server/scheduler.ts src/server/trpc/repository.ts src/features/finance/currency.ts src/features/finance/FinanceApp.tsx src/routes/api.cron.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none — but for chart normalization to work well, the exchange rate data needs to be populated (via cron job)
- **Category**: direction
- **Planned at**: commit `d3d7ba8`, 2026-06-15

## Why this matters

The README roadmap lists "Multi-currency exchange rate auto-fetch" as a planned feature. The `exchangeRates` table exists in the schema (`src/server/db/schema.ts:209-217`) but has **zero** code reading or writing it. The app supports 7 currencies (USD, EUR, UAH, GBP, PLN, CAD, JPY) but every aggregation — charts, summaries, metrics — treats all currency amounts as equal. A $50 USD transaction and a €50 EUR transaction show identical bar heights. This plan adds a daily cron job to fetch rates from a free API (Frankfurter) and an optional normalization in the aggregation pipeline.

## Current state

**Schema** (`src/server/db/schema.ts:209-217`):
```ts
export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  baseCurrency: text('base_currency').notNull(),
  quoteCurrency: text('quote_currency').notNull(),
  rate: numeric('rate', { precision: 18, scale: 8 }).notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
})
```

**Currencies** (`src/features/finance/currency.ts`):
```ts
export const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
] as const
```

**Aggregations** (`src/server/aggregations.ts`):
- `summarizeTransactions(transactions)` — adds `amountMinor` directly, ignoring currency
- `groupTransactionsByInterval(...)` — divides by 100 for chart display, but again ignores currency
- These functions are imported client-side via `src/features/finance/metrics.ts`

**Scheduler** (`src/server/scheduler.ts`):
- In-process `setInterval`-based cron, hourly
- Dynamic imports for `db/client` and `trpc/repository`
- Called from `startSubscriptionScheduler()` which has a `started` guard

**REST API** (`src/routes/api.cron.ts`):
- Endpoint `GET /api/cron` secured by `CRON_SECRET` header
- Currently only processes subscriptions

## Commands you will need

| Purpose            | Command                  | Expected on success |
|--------------------|--------------------------|---------------------|
| Install            | `bun install`            | exit 0              |
| Typecheck          | `bun x tsc --noEmit`     | exit 0              |
| Lint               | `bun run lint`           | exit 0              |

What Frankfurter rates look like (example data shape for reference — no network calls in verification):

```json
// GET https://api.frankfurter.dev/latest?from=USD
{
  "amount": 1,
  "base": "USD",
  "date": "2026-06-15",
  "rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 157.32,
    "CAD": 1.37,
    "PLN": 4.02,
    "UAH": 41.50
  }
}
```

## Scope

**In scope**:
- `src/server/scheduler.ts` — add exchange rate fetching to the existing scheduler
- `src/server/trpc/repository.ts` — add `fetchExchangeRates()` to get latest rates from Frankfurter and store in DB
- `src/server/aggregations.ts` — add `normalizeTransaction(transaction, rates)` helper and a `normalizeToCurrency` flag to `summarizeTransactions` / `groupTransactionsByInterval`
- `src/features/finance/currency.ts` — add rate reference data (which currencies need rates from Frankfurter)
- `src/features/finance/TransactionsPanel.tsx` — add a "Normalize to default currency" toggle
- `src/routes/api.cron.ts` — optionally trigger exchange rate fetch alongside subscriptions

**Out of scope**:
- Historical exchange rate fetching — Frankfurter only provides latest rates; this plan only gets current rates
- Real-time conversion on every transaction display — rates are fetched daily and cached
- Converting currencies on the REST API — that's a separate extension
- Updating existing stored transactions' amounts (the plan normalizes at display time only)

## Git workflow

- Branch: `advisor/006-exchange-rates`
- Commit style: conventional commits, e.g.:
  1. `feat: add exchange rate fetching and storage to repository`
  2. `feat: add currency normalization to aggregation pipeline`
  3. `feat: add normalize toggle to TransactionsPanel`
- Do NOT push or open a PR unless told to.
- Do NOT run `db:migrate` — the `exchangeRates` table already exists from a prior migration.

## Steps

### Step 1: Add exchange rate repository functions

In `src/server/trpc/repository.ts`, add:

**`fetchAndStoreExchangeRates`** — fetches latest rates from Frankfurter and stores them:

```ts
export async function fetchAndStoreExchangeRates(): Promise<{ stored: number }> {
  const database = assertDatabase()

  // Frankfurter API: free, no key needed, supports all currencies in the app
  const response = await fetch('https://api.frankfurter.dev/latest?from=USD')
  if (!response.ok) throw new Error(`Frankfurter API returned ${response.status}`)

  const data = await response.json() as { base: string; date: string; rates: Record<string, number> }
  const { base, rates } = data

  let stored = 0
  for (const [quoteCurrency, rate] of Object.entries(rates)) {
    await database.insert(exchangeRatesTable).values({
      baseCurrency: base,
      quoteCurrency,
      rate: String(rate),
      capturedAt: new Date(),
    })
    stored++
  }

  // Also store the self-rate (USD to USD = 1)
  await database.insert(exchangeRatesTable).values({
    baseCurrency: base,
    quoteCurrency: base,
    rate: '1',
    capturedAt: new Date(),
  })
  stored++

  return { stored }
}
```

**`getLatestExchangeRates`** — returns the most recent rates keyed by quote currency:

```ts
export async function getLatestExchangeRates(): Promise<Map<string, number>> {
  const database = assertDatabase()

  const rows = await database
    .select()
    .from(exchangeRatesTable)
    .orderBy(desc(exchangeRatesTable.capturedAt))
    .limit(20) // enough for ~7 currencies × self-rate

  const rates = new Map<string, number>()
  // Drizzle returns rate as string (it's numeric type in PG)
  for (const row of rows) {
    if (!rates.has(row.quoteCurrency)) {
      rates.set(row.quoteCurrency, Number(row.rate))
    }
  }

  return rates
}
```

Add `desc` to the Drizzle imports at the top of the file (it's already imported for other queries).

### Step 2: Wire exchange rate fetch into the scheduler

In `src/server/scheduler.ts`, modify the `run()` function to also fetch exchange rates:

```ts
async function run() {
  try {
    const { db, hasDatabase } = await import('./db/client')
    if (!hasDatabase || !db) return

    // Existing subscription processing
    const { processAllSubscriptions, fetchAndStoreExchangeRates } = await import('./trpc/repository')
    const subResult = await processAllSubscriptions()
    if (subResult.processed > 0) {
      console.log(`[scheduler] Auto-created ${subResult.processed} subscription transaction(s)`)
    }

    // Exchange rate fetch
    const rateResult = await fetchAndStoreExchangeRates()
    console.log(`[scheduler] Stored ${rateResult.stored} exchange rates`)
  } catch (error) {
    console.error('[scheduler] Failed to run:', error)
  }
}
```

Limit exchange rate fetching to once per day — wrap it in a date check:

```ts
// Only fetch rates if none exist today
const { getLatestExchangeRates } = await import('./trpc/repository')
const existingRates = await getLatestExchangeRates()
if (existingRates.size === 0) {
  const rateResult = await fetchAndStoreExchangeRates()
  console.log(`[scheduler] Stored ${rateResult.stored} exchange rates`)
}
```

### Step 3: Add currency normalization to aggregations

In `src/server/aggregations.ts`, add:

```ts
// Currency conversion helpers
type ExchangeRateMap = Map<string, number>

export function normalizeAmountMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRateMap,
): number {
  if (fromCurrency === toCurrency) return amountMinor

  // Convert from original currency to USD via rate
  const fromRate = rates.get(fromCurrency)
  const toRate = rates.get(toCurrency)
  if (!fromRate || !toRate) return amountMinor // fallback: no conversion

  // amountMinor (in fromCurrency) → USD → toCurrency
  const inUsdMinor = fromCurrency === 'USD'
    ? amountMinor
    : Math.round(amountMinor / fromRate)

  return toCurrency === 'USD'
    ? inUsdMinor
    : Math.round(inUsdMinor * toRate)
}
```

Modify `summarizeTransactions` to accept an optional conversion parameter:

```ts
export function summarizeTransactions(
  transactions: Transaction[],
  options?: { normalizeCurrency?: string; rates?: ExchangeRateMap },
) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = options?.normalizeCurrency && options?.rates
        ? normalizeAmountMinor(transaction.amountMinor, transaction.currency, options.normalizeCurrency, options.rates)
        : transaction.amountMinor

      if (transaction.type === 'income') {
        summary.gained += amount
      } else {
        summary.spent += amount
      }
      return summary
    },
    { spent: 0, gained: 0 },
  )
}
```

Similarly modify `groupTransactionsByInterval`.

### Step 4: Add normalisation toggle to TransactionsPanel

In `src/features/finance/TransactionsPanel.tsx`:

1. Add a state variable:
```tsx
const [normalizeCurrency, setNormalizeCurrency] = useState(false)
```

2. The `normalizeCurrency` toggle requires exchange rates. Fetch them lazily. Add a `useEffect` that loads rates when the toggle is enabled. Or simpler: always compute the normalized view from the already-fetched data.

3. Add a small toggle next to the sort/filter bar or in the metrics row:
```tsx
<label className="flex items-center gap-2 text-xs text-muted-foreground">
  <input
    type="checkbox"
    checked={normalizeCurrency}
    onChange={(e) => setNormalizeCurrency(e.target.checked)}
    className="rounded"
  />
  Normalize to {profile?.defaultCurrency ?? 'USD'}
</label>
```

4. Pass `normalizeCurrency` to the summary/chart calls. The exchange rates need to be available — fetch them from a new tRPC query `getExchangeRates` or embed them in the dashboard response (simpler: add to `DashboardData`).

**Recommendation**: Add a computed `normalizedTransactions` in `TransactionsPanel` that converts all amounts to the profile's `defaultCurrency` when the toggle is on:

```tsx
const normalizedCurrency = profile?.defaultCurrency ?? 'USD'

const normalizedTransactions = useMemo(() => {
  if (!normalizeCurrency || rates.size === 0) return filteredTransactions
  return filteredTransactions.map((tx) => ({
    ...tx,
    amountMinor: normalizeAmountMinor(tx.amountMinor, tx.currency, normalizedCurrency, rates),
    currency: normalizedCurrency,
  }))
}, [filteredTransactions, normalizeCurrency, rates, normalizedCurrency])
```

### Step 5: Add getExchangeRates tRPC query

In `src/server/trpc/router.ts`, add:

```ts
getExchangeRates: authenticatedProcedure.query(async () => {
  const { getLatestExchangeRates } = await import('./repository')
  const rates = await getLatestExchangeRates()
  return Object.fromEntries(rates)
}),
```

In `useFinanceData.ts`, add a fetch for exchange rates (or include them in the dashboard response — simpler: embed in the existing dashboard query since rates are per-instance, not per-user).

### Step 6: Add exchange rate fetching to /api/cron

In `src/routes/api.cron.ts`, after processing subscriptions, also call `fetchAndStoreExchangeRates`:

```tsx
const result = await processAllSubscriptions()

// Also fetch exchange rates
const { fetchAndStoreExchangeRates } = await import('@/server/trpc/repository')
const rateResult = await fetchAndStoreExchangeRates().catch(() => ({ stored: 0 }))

return new Response(
  JSON.stringify({ processed: result.processed, ratesStored: rateResult.stored }),
  { status: 200, headers: { 'Content-Type': 'application/json' } },
)
```

### Step 7: Verify

```bash
bun x tsc --noEmit
bun run lint
```

## Test plan

Manual verification:

- [ ] Run the scheduler or hit `/api/cron` — exchange rates are stored in the `exchange_rates` table
- [ ] `getLatestExchangeRates` returns rates for all 7 currencies
- [ ] With the "Normalize" toggle off, a $50 and €50 transaction show as identical heights
- [ ] With the toggle on, the €50 transaction's height adjusts relative to USD
- [ ] The summary metrics update to reflect normalized amounts
- [ ] Toggling normalization on/off is instant (client-side rememoization)

## Done criteria

Machine-checkable:

- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -rn "fetchAndStoreExchangeRates" src/server/trpc/repository.ts` returns a match
- [ ] `grep -rn "getLatestExchangeRates" src/server/trpc/repository.ts` returns a match
- [ ] `grep -rn "normalizeAmountMinor" src/server/aggregations.ts` returns a match
- [ ] `grep -rn "normalizeCurrency" src/features/finance/TransactionsPanel.tsx` returns a match (or equivalent)
- [ ] No files outside the in-scope list are modified

## STOP conditions

Stop and report back (do not improvise) if:

- Frankfurter API changes its URL schema or drops support — the plan targets `https://api.frankfurter.dev/latest?from=USD`. If this is unreachable, choose an alternative free API (exchangerate.host, exchangeratesapi.io).
- The `numeric` type from Drizzle returns a string instead of a number — handle with `Number(rate)` which is already done in `getLatestExchangeRates`.
- The `normalizeCurrency` toggle causes a React re-render loop — use `useMemo` with stable deps.

## Maintenance notes

- Frankfurter API is free and does not require an API key. If it becomes rate-limited or goes away, switch to `exchangerate.host` or another free provider.
- Rates are fetched once per day (checked by `existingRates.size === 0`). If the app server is restarted, rates are re-fetched on the first scheduler tick.
- The `exchangeRates` table has no expiration or cleanup — old rows accumulate. Add a periodic cleanup (`DELETE FROM exchange_rates WHERE captured_at < NOW() - INTERVAL '30 days'`) if storage becomes a concern.
- The normalization happens at display time, not in storage. This means charts and summaries show different numbers with the toggle on, but the underlying transaction data is preserved in its original currency.
