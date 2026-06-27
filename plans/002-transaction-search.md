# Plan 002: Add transaction search, category filter, and sort

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat d3d7ba8..HEAD -- src/features/finance/TransactionsPanel.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `1433604`, 2026-06-27 (refreshed during reconcile; originally `d3d7ba8`)

## Why this matters

`TransactionsPanel` renders every transaction in the selected period without any way to search, filter by category, or sort. With a few months of data, finding a specific transaction requires scrolling through hundreds of rows. A search box and category dropdown let users find transactions by name, note, or label instantly. Client-side filtering on the already-fetched `transactions` array means zero backend changes and instant results for a personal dataset.

## Current state

- `src/features/finance/TransactionsPanel.tsx` — the only file affected. It already receives `transactions: Transaction[]` as a prop, has `useMemo` for filteredTransactions (currently filtering only by period), and has a `currency` variable derived from transactions. The component has a period navigation bar (week/month/year + prev/next) and a chart + transaction list.

Key excerpt — the filtering logic (lines 56-87):

```tsx
const bounds = useMemo(
  () => getPeriodBounds(anchorDate, viewMode),
  [anchorDate, viewMode],
)
const filteredTransactions = useMemo(
  () => filterTransactionsByPeriod(transactions, bounds),
  [transactions, bounds],
)
// ...
const hasTransactions = filteredTransactions.length > 0
```

Key excerpt — the period nav row (lines 91-110):

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex items-center gap-2">
    {/* prev/next buttons + period label */}
  </div>
  <Tabs value={viewMode} onValueChange={...}>
    {/* week/month/year tabs */}
  </Tabs>
</div>
```

The `Transaction` type (from `@/server/trpc/types`) has these filterable fields:
```ts
type Transaction = {
  id: string
  type: 'expense' | 'income'
  categoryId: string
  categoryName: string
  categoryIcon: string
  amountMinor: number
  currency: string
  operationDate: string
  note: string | null
  labels: string[]
}
```

Repo conventions:
- `useMemo` + `useState` for derived state
- Import components from `@/components/ui/*` (shadcn)
- Icons from `lucide-react`
- `cn()` from `@/lib/utils` for conditional classes
- Styling: Tailwind v4 utility classes
- Animation: `import { motion } from 'motion/react'` with `itemMotion`, `listMotion`, etc.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun x tsc --noEmit`     | exit 0, no errors   |
| Lint      | `bun run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/features/finance/TransactionsPanel.tsx` — add search input, category filter dropdown, sort toggle

**Out of scope** (do NOT touch):
- Any server-side code — this is pure client-side filtering
- Any other panel (SubscriptionsPanel, WishlistPanel, SettingsPanel)
- Pagination — not needed for personal-scale data
- The tRPC router or REST API

## Git workflow

- Branch: `advisor/002-transaction-search`
- Commit style: conventional commits (e.g. `feat: add transaction search, category filter, and sort`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add search and filter state

At the top of the `TransactionsPanel` function, add three new state variables alongside the existing ones:

```tsx
const [searchQuery, setSearchQuery] = useState('')
const [filterCategoryId, setFilterCategoryId] = useState<string>('__all__')
const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'largest'>('newest')
```

### Step 2: Collect unique categories from the period's transactions

Add a `useMemo` that extracts unique categories from the period-filtered transactions (before search/sort is applied). This feeds the category filter dropdown.

```tsx
const periodCategories = useMemo(() => {
  const seen = new Map<string, { id: string; name: string; icon: string }>()
  for (const tx of periodFiltered) {
    if (!seen.has(tx.categoryId)) {
      seen.set(tx.categoryId, { id: tx.categoryId, name: tx.categoryName, icon: tx.categoryIcon })
    }
  }
  return Array.from(seen.values())
}, [periodFiltered])
```

Where `periodFiltered` is the existing period-bound filter (renamed from `filteredTransactions`). Rename the existing `filteredTransactions` to `periodFiltered` to make room for the final `filteredTransactions` that layers all filters:

```tsx
// Step 2a: rename existing
const periodFiltered = useMemo(
  () => filterTransactionsByPeriod(transactions, bounds),
  [transactions, bounds],
)
```

### Step 3: Layer search + category + sort into final `filteredTransactions`

Add a new `useMemo` that takes `periodFiltered` and applies search, category, and sort:

```tsx
const filteredTransactions = useMemo(() => {
  let result = periodFiltered

  // Text search: match against categoryName, note, and labels
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    result = result.filter((tx) =>
      tx.categoryName.toLowerCase().includes(q) ||
      (tx.note ?? '').toLowerCase().includes(q) ||
      tx.labels.some((l) => l.toLowerCase().includes(q))
    )
  }

  // Category filter
  if (filterCategoryId !== '__all__') {
    result = result.filter((tx) => tx.categoryId === filterCategoryId)
  }

  // Sort
  result = [...result].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':
        return a.operationDate.localeCompare(b.operationDate)
      case 'largest':
        return b.amountMinor - a.amountMinor
      case 'newest':
      default:
        return b.operationDate.localeCompare(a.operationDate)
    }
  })

  return result
}, [periodFiltered, searchQuery, filterCategoryId, sortOrder])
```

Update the `currency` variable to source from `periodFiltered` (still makes sense for the chart), and the chart data should still use `periodFiltered` (not `filteredTransactions` — the chart shows the full period, search only affects the list):

```tsx
const currency = periodFiltered[0]?.currency ?? transactions[0]?.currency ?? 'USD'
const hasTransactions = periodFiltered.length > 0
```

### Step 4: Render the filter bar UI

Insert a filter bar between the period navigation row and the metrics cards. Follow the existing style: `border bg-card rounded-md p-3`.

```tsx
{/* Filter bar */}
<div className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center">
  {/* Search input */}
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search by name, note, or label…"
      className="pl-9 h-9 text-sm"
    />
  </div>

  {/* Category filter */}
  <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
    <SelectTrigger className="h-9 w-full sm:w-44">
      <SelectValue placeholder="All categories" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__all__">All categories</SelectItem>
      {periodCategories.map((cat) => (
        <SelectItem key={cat.id} value={cat.id}>
          <span className="flex items-center gap-2">
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* Sort toggle */}
  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
    <SelectTrigger className="h-9 w-full sm:w-36">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="newest">Newest first</SelectItem>
      <SelectItem value="oldest">Oldest first</SelectItem>
      <SelectItem value="largest">Largest first</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Import the required components and icons at the top:

```tsx
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
```

### Step 5: Wire the transaction list to `filteredTransactions`

The existing transaction list render already uses `filteredTransactions`. After the rename in step 2, it should now point to the newly computed `filteredTransactions` (the one with all three filters). Verify the JSX block starting at `{hasTransactions ? (` still references `filteredTransactions`. No change needed if the rename is correct.

The empty state message should distinguish between "no transactions in this period" and "no transactions match your search":

```tsx
{periodFiltered.length > 0 && filteredTransactions.length === 0 ? (
  <motion.div className="rounded-md border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground" variants={itemMotion}>
    No transactions match your current search or filters.
  </motion.div>
) : null}
```

Display this above the existing empty-period message.

### Step 6: Verify

```bash
bun x tsc --noEmit
bun run lint
```

Fix any type errors or lint violations in `TransactionsPanel.tsx` only.

## Test plan

Manual verification (no automated test infrastructure exists yet):

- [ ] Type a category name in the search box — matching transactions appear
- [ ] Type a note keyword — matching transactions appear
- [ ] Type a label name — matching transactions appear
- [ ] Select a category from the dropdown — only that category's transactions appear
- [ ] Combine search + category filter — intersection works
- [ ] Toggle sort to "Oldest first" — list reverses
- [ ] Toggle sort to "Largest first" — highest amounts on top
- [ ] Clear the search query — all period transactions reappear
- [ ] The chart and metrics cards still show the full period totals (not affected by search/filter)
- [ ] The category dropdown shows only categories that appear in the current period

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0 (existing pre-existing lint errors elsewhere are OK if `TransactionsPanel.tsx` has none)
- [ ] `grep -rn "searchQuery" src/features/finance/TransactionsPanel.tsx` returns matches
- [ ] `grep -rn "filterCategoryId" src/features/finance/TransactionsPanel.tsx` returns matches
- [ ] `grep -rn "periodFiltered" src/features/finance/TransactionsPanel.tsx` returns matches (confirms rename)
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- The rename from `filteredTransactions` to `periodFiltered` causes a cascade of errors across the file — if the rename touches >5 locations, stop and consider a different approach (append a new variable instead of renaming).
- The type of `sortOrder` doesn't narrow correctly from `Select`'s `onValueChange` — cast it explicitly with `as 'newest' | 'oldest' | 'largest'`.
- Pre-existing lint/type errors in the file obscure new ones — run lint on just this file: `bun x eslint src/features/finance/TransactionsPanel.tsx`.

## Maintenance notes

- The filter hydrates from `periodFiltered`, so categories that appear in the data automatically show up in the dropdown — no maintenance needed when categories change.
- If the dataset ever reaches 10k+ transactions, consider moving search to the server. For a personal finance app with <1k transactions per year, client-side is sufficient.
- The sort toggles are in a Select; if a 4th sort order is added later (e.g., "by category"), add it to the `sortOrder` type and the `sort()` switch.
