# Plan 003: Add notification center for upcoming subscription bills

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat 7fbccd1..HEAD -- src/features/finance/FinanceApp.tsx src/features/finance/SubscriptionsPanel.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `7fbccd1`, 2026-06-30 (refreshed during reconcile; originally `d3d7ba8`)

## Why this matters

The `FinanceApp` header already renders a `Bell` notification button (`src/features/finance/FinanceApp.tsx:147-152`) but it's completely dead — no click handler, no state, no panel. The subscription data already includes `nextChargeDate`, `status`, `billingFrequency`, and `amountMinor`. Computing upcoming bills from the subscriptions array and showing them in a popover turns a dead UI element into a useful feature for zero backend cost.

## Current state

`src/features/finance/FinanceApp.tsx` — header section (lines ~140-157).
Note: plan 001 (PWA) has since added `<InstallPrompt />` as the first child
of the header's right-side `<div>` (line ~148), before the notifications
`<Button>`. Place `<BillsPopover />` after the `<InstallPrompt />` and before
(or alongside) the Bell button. The Bell button itself is unchanged.

```tsx
<header className="flex items-center justify-between gap-3 border-b pb-4">
  <div className="flex items-center gap-3">
    <img src="/logo.svg" alt="Ledger" className="size-10 shrink-0" />
    <div>
      <h1 className="text-xl font-semibold tracking-normal">Ledger</h1>
      <p className="text-sm text-muted-foreground">
        Expenses, income, and recurring services
      </p>
    </div>
  </div>
  <div className="hidden items-center gap-2 md:flex">
    <Button variant="outline" size="icon" aria-label="Notifications">
      <Bell />
    </Button>
  </div>
</header>
```

The `SubscriptionsPanel` already accesses `subscriptions` — this has fields:
```ts
type Subscription = {
  id: string
  name: string
  categoryId: string | null
  amountMinor: number
  currency: string
  billingDay: number
  nextChargeDate: string          // "YYYY-MM-DD"
  billingFrequency: 'monthly' | 'yearly'
  status: 'active' | 'paused' | 'cancelled'
  autoCreateTransactions: boolean
  notes: string | null
}
```

The `useFinanceData` hook already returns `subscriptions: Subscription[]`.

Repo conventions:
- Icon from `lucide-react`
- UI components from `@/components/ui/*`
- `cn()` from `@/lib/utils`
- Animations: `motion` from `motion/react`
- `formatMoney()` from `./format` for currency display
- `date-fns` for date formatting

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun x tsc --noEmit`     | exit 0              |
| Lint      | `bun run lint`           | exit 0 (or pre-existing errors elsewhere) |

## Scope

**In scope**:
- `src/features/finance/FinanceApp.tsx` — replace dead bell button with an active popover
- `src/features/finance/BillsPopover.tsx` — new file, popover component

**Out of scope**:
- Push notifications via service worker
- Email/SMS reminders
- Any server-side changes
- The subscription processing logic itself (already works)

## Git workflow

- Branch: `advisor/003-notification-center`
- Commit style: conventional commits, e.g. `feat: add notification popover for upcoming subscriptions`
- Do NOT push or open a PR unless told to.

## Steps

### Step 1: Create BillsPopover component

Create `src/features/finance/BillsPopover.tsx`:

This component receives `subscriptions: Subscription[]` and renders:

1. A trigger `<Button>` with the `Bell` icon (same appearance as the current dead button)
2. A `Popover` that opens on click
3. Inside the popover: compute upcoming bills due within 7 days and 30 days, group by timeframe
4. For each subscription due: show name, formatted amount, next charge date, and days remaining
5. If no subscriptions are active or due, show an empty state

The logic for computing upcoming charges:

```ts
function getUpcomingBills(subscriptions: Subscription[], daysAhead: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + daysAhead)

  return subscriptions.filter((sub) => {
    if (sub.status !== 'active') return false
    const chargeDate = new Date(sub.nextChargeDate)
    chargeDate.setHours(0, 0, 0, 0)
    return chargeDate >= today && chargeDate < horizon
  })
}
```

Use `date-fns` with `format` and `differenceInDays` for display.

Component shape (follow existing patterns):

```tsx
import { Bell } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { differenceInDays, format } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatMoney } from './format'

type BillsPopoverProps = {
  subscriptions: Array<{
    id: string
    name: string
    amountMinor: number
    currency: string
    nextChargeDate: string
    billingFrequency: string
    status: string
  }>
}

export function BillsPopover({ subscriptions }: BillsPopoverProps) {
  // compute due in 7 days, due in 30 days
  // if none: show empty state
  // render list with grouped sections
}

function DaysBadge({ date }: { date: string }) {
  const days = differenceInDays(new Date(date), new Date())
  if (days === 0) return <span className="text-xs font-semibold text-destructive">Today</span>
  if (days === 1) return <span className="text-xs text-amber-600">Tomorrow</span>
  return <span className="text-xs text-muted-foreground">{days} days</span>
}
```

### Step 2: Wire BillsPopover into FinanceApp header

Import and replace the dead Bell button:

```tsx
import { BillsPopover } from './BillsPopover'

// In the header, replace:
<Button variant="outline" size="icon" aria-label="Notifications">
  <Bell />
</Button>

// With:
<BillsPopover subscriptions={subscriptions} />
```

Add `subscriptions` to the destructured values if not already there. The `useFinanceData` hook already returns `subscriptions` — verify it's destructured in `FinanceApp.tsx`:

```tsx
const {
  subscriptions,
  // ... other destructured values
} = useFinanceData()
```

If `subscriptions` is not destructured, add it to the existing destructure statement.

### Step 3: Verify

```bash
bun x tsc --noEmit
bun run lint
```

Fix any type or lint errors in the new and modified files.

## Test plan

Manual verification:

- [ ] The bell icon shows a badge with the count of subscriptions due in the next 7 days
- [ ] Clicking the bell opens a popover with two sections: "Due within 7 days" and "Due within 30 days"
- [ ] Each subscription shows name, formatted amount, and days remaining
- [ ] If no subscriptions exist, the popover shows "No upcoming bills"
- [ ] If all subscriptions are paused/cancelled, the popover shows "No upcoming bills"
- [ ] The bell icon functions identically on mobile (in the bottom nav) — **consider:** the bell is only in the desktop header. Mobile has no bell. This plan does NOT add a bell to mobile; separate future work.

## Done criteria

Machine-checkable:

- [ ] `src/features/finance/BillsPopover.tsx` exists with exported `BillsPopover` function
- [ ] `bun x tsc --noEmit` exits 0
- [ ] `grep -rn "BillsPopover" src/features/finance/FinanceApp.tsx` returns a match
- [ ] No files outside the in-scope list are modified

## STOP conditions

Stop and report back (do not improvise) if:

- The `subscriptions` prop type in `BillsPopover` conflicts with the `Subscription` type from `@/server/trpc/types` — import and use that type directly with a `Pick<Subscription, '...'>` if needed.
- `date-fns` isn't already a dependency — check `package.json` first (it is, at `^4.3.0`).
- The popover doesn't render correctly on mobile because it's in a `hidden md:flex` div — that's intended; the bell is desktop-only.

## Maintenance notes

- The "due in 7 days" and "due in 30 days" checks use client-side date comparison. If the user's local clock is misconfigured, the numbers may be off. This is acceptable for a personal app.
- When push notifications are added later (service worker), this popover's logic can be reused to generate the notification payload.
