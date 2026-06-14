# Plan 007: Fix correctness issues and establish verification baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat d3d7ba8..HEAD -- src/ packages/ scripts/`
> If any file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0 (prerequisite for all other plans)
- **Effort**: M (six small fixes combined)
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness + dx + tests
- **Planned at**: commit `d3d7ba8`, 2026-06-15

## Why this matters

The codebase has 0 tests, 19 lint errors, and 16 TypeScript errors across 3 packages. Every change made today is risky because there's no way to verify it works. This plan fixes the type errors, lint errors, and correctness bugs in a single pass — establishing a clean baseline so future changes can be verified with `tsc --noEmit` and `bun run lint`.

Specific bugs fixed:
- **Billing day 31**: `subscriptionInput` allows `billingDay: 31`, but months like Feb/Apr/Jun/Sept/Nov don't have 31 days.
- **Missing label sync on update**: `updateTransaction` doesn't add new labels to the labels table like `createTransaction` does.
- **Scheduler side effect on import**: `src/routes/api.v1.$.ts` and `src/routes/api.cron.ts` call `startSubscriptionScheduler()` at module level.
- **CLI type errors**: `packages/finances-cli/src/index.ts` has 16 type errors because the `run()` wrapper expects `(...args: unknown[])` but handlers have typed params.
- **Seed script type errors**: `scripts/seed-transactions.ts` has 6 type/lint errors.
- **FinanceApp type error**: `src/features/finance/FinanceApp.tsx` 2 type errors from incorrect prop types.
- **OperationDialog type error**: `src/features/finance/OperationDialog.tsx` 2 type errors on `initial`.

## Current state

**Finding 08 — billingDay allows 31** (`src/server/trpc/validators.ts:39`):
```ts
billingDay: z.coerce.number().int().min(1).max(31).optional(),
```
Fix: `max(28)` instead of `max(31)`.

**Finding 05 — updateTransaction doesn't sync labels** (`src/server/trpc/repository.ts:616-662`):
`createTransaction` (line ~361) calls `syncLabels(user.id, input.labels)`. `updateTransaction` ends around line 662 and does not call `syncLabels`. Fix: add the same call after the update succeeds.

**Finding 04 — Scheduler called at module level** (`src/routes/api.v1.$.ts:12`):
```ts
import { startSubscriptionScheduler } from '@/server/scheduler'
startSubscriptionScheduler()
```
Same pattern in `src/routes/api.cron.ts:6`. Fix: remove these top-level calls. The scheduler is already started elsewhere (it's called on every request anyway). Or better: remove the route-level calls entirely and let the app start it at a single entry point if needed — but for now just removing them is safe because `processSubscriptions` is still called explicitly via the cron endpoint and the tRPC mutation.

Wait — `startSubscriptionScheduler` is also called inside `api.v1.$.ts` and `api.cron.ts` route handlers. It's also called nowhere else. So if we remove the top-level calls, the scheduler never starts. The right fix: move the scheduler start to a single place that's imported from the app's entry point, or just leave the cron endpoint and tRPC mutation as the only ways to process subscriptions.

Actually, looking more carefully: the scheduler is the in-process interval that auto-creates subscription transactions. Without it, subscriptions won't be auto-processed unless someone hits `/api/cron` or calls the tRPC mutation. The design comment in `scheduler.ts` says: "For production with multiple server instances, consider using an external cron service."

**Simplest fix**: remove `startSubscriptionScheduler()` from both route files. The subscription processing already works via the external cron endpoint (`/api/cron`). The in-process scheduler was a convenience that was poorly placed. This fix removes the bad placement; if the user wants the in-process scheduler, it should be started from the server entry point (not route modules).

**Finding 09 — CLI type errors** (`packages/finances-cli/src/index.ts`):
The `run()` wrapper function is:
```ts
function run(fn: (...args: unknown[]) => Promise<void>) {
  return (...args: unknown[]) => fn(...args).catch(handleError)
}
```
But every command's `.action()` callback has typed params like `(id: string)` or `(opts: Record<string, string>)`. These are incompatible with `(...args: unknown[])`. Fix: widen the `run` function's type or use type-safe commander wrapper. Easiest: change `run` to use rest params and let commander handle dispatch types.

**Seed script errors** (`scripts/seed-transactions.ts`):
- Line 19: `inArray` is imported but unused
- Line 141: unnecessary conditional (always falsy)
- Lines 152, 164, 165: unnecessary type assertions
- Lines 155, 253: unnecessary conditional (always truthy)

**FinanceApp TS errors** (`src/features/finance/FinanceApp.tsx`):
- Line 197: `(name: string) => void` vs `(input: { name: string }) => Promise<Label>`
- Line 198: `Transaction | null` vs `Transaction | undefined` for `editingTx`
- Line 256: `Promise<Label>` vs `Promise<void>` for `onAddLabel`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun x tsc --noEmit`     | exit 0, no errors   |
| Lint      | `bun run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):

| File | Change |
|------|--------|
| `src/server/trpc/validators.ts` | `billingDay: max(28)` |
| `src/server/trpc/repository.ts` | Add `syncLabels` call in `updateTransaction` |
| `src/routes/api.v1.$.ts` | Remove `startSubscriptionScheduler()` call + import |
| `src/routes/api.cron.ts` | Remove `startSubscriptionScheduler()` call + import |
| `packages/finances-cli/src/index.ts` | Fix `run()` wrapper type signature |
| `scripts/seed-transactions.ts` | Fix 6 lint/type errors |
| `src/features/finance/FinanceApp.tsx` | Fix 3 type errors |
| `src/features/finance/OperationDialog.tsx` | Fix 2 type errors |
| `src/features/finance/SettingsPanel.tsx` | Fix `onAddLabel` prop type (if needed by FinanceApp fix) |
| `src/features/finance/useFinanceData.ts` | Fix return types if needed by FinanceApp fix |
| `src/features/finance/TransactionsPanel.tsx` | Fix lint error (line 84 unnecessary `??`) and inline type import (line 25) |

**Out of scope** (do NOT touch):
- The REST API refactor (perf finding 02) — that's a separate plan
- Database transactions for multi-write ops (finding 03) — separate plan
- TanStack Query migration (finding 06) — separate plan
- Adding foreign key on `subscriptionId` (finding 07) — schema migration, separate plan
- Adding actual test files (verification baseline test infrastructure) — separate plan
- Any schema changes or database operations

## Git workflow

- Branch: `advisor/007-fix-baseline`
- Commit style: conventional commits, one commit per logical group:
  1. `fix: cap billingDay at 28 to avoid invalid dates`
  2. `fix: sync labels in updateTransaction`
  3. `fix: remove scheduler side-effect from route module imports`
  4. `fix: correct CLI wrapper type signature to fix 16 TS errors`
  5. `fix: resolve lint and type errors in FinanceApp, OperationDialog, seed script`
- Do NOT push or open a PR unless told to.

## Steps

### Step 1: Fix billingDay validation

In `src/server/trpc/validators.ts:39`, change:

```ts
billingDay: z.coerce.number().int().min(1).max(31).optional(),
```

to:

```ts
billingDay: z.coerce.number().int().min(1).max(28).optional(),
```

**Verify**: `grep "max(28)" src/server/trpc/validators.ts` returns a match.

### Step 2: Add label sync to updateTransaction

In `src/server/trpc/repository.ts`, inside `updateTransaction`, after the update succeeds and before the return, add:

```ts
// Sync new labels to the labels table
if (input.labels && input.labels.length > 0) {
  await syncLabels(user.id, input.labels)
}
```

Place this after line ~638 (`const [updated] = await database.update(...).returning()`) but before the `getDashboard` / category lookup.

**Verify**: `grep -n "syncLabels" src/server/trpc/repository.ts` shows a match inside the `updateTransaction` function (not just in `createTransaction`).

### Step 3: Remove scheduler from route files

In `src/routes/api.v1.$.ts`:
- Remove the line `import { startSubscriptionScheduler } from '@/server/scheduler'`
- Remove the line `startSubscriptionScheduler()` near the top

In `src/routes/api.cron.ts`:
- Remove the line `import { startSubscriptionScheduler } from '@/server/scheduler'`
- Remove the line `startSubscriptionScheduler()` near the top

**Verify**: `grep -rn "startSubscriptionScheduler" src/routes/` returns no matches.

### Step 4: Fix CLI type errors

In `packages/finances-cli/src/index.ts`, change the `run` function from:

```ts
function run(fn: (...args: unknown[]) => Promise<void>) {
  return (...args: unknown[]) => {
    fn(...args).catch(handleError)
  }
}
```

to use a generic type that accepts any function:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function run(fn: (...args: any[]) => Promise<void>) {
  return (...args: any[]) => {
    fn(...args).catch(handleError)
  }
}
```

This avoids the type mismatch between `unknown` and specific argument types that `commander` passes.

Also fix the 5 `@typescript-eslint/no-unnecessary-condition` errors in the same file (lines 245, 385-388, 391). These occur where optional chaining `?.` is used on values that the types say are always present. Follow the lint error messages to fix each one — in most cases just use direct property access instead of `?.`.

**Verify**: `bun x eslint packages/finances-cli/src/index.ts` exits 0.

### Step 5: Fix seed script type errors

In `scripts/seed-transactions.ts`:

1. Remove `inArray` from the Drizzle import (line 6: `import { eq, inArray } from 'drizzle-orm'` → `import { eq } from 'drizzle-orm'`)
2. Fix the 5 `@typescript-eslint/no-unnecessary-condition` errors (lines 141, 152, 155, 164, 165, 253):
   - Line 141: remove the unnecessary condition check
   - Line 152: remove unnecessary `as` type assertion
   - Line 155: remove the unnecessary truthy check
   - Lines 164-165: remove unnecessary `as` type assertions  
   - Line 253: remove the unnecessary truthy check

Read each line and apply the fix the linter suggests.

**Verify**: `bun x eslint scripts/seed-transactions.ts` exits 0. `bun x tsc --noEmit` should show fewer errors.

### Step 6: Fix FinanceApp type errors

In `src/features/finance/FinanceApp.tsx`:

**Error at line 197**: `(input: Parameters<typeof trpc.createLabel.mutate>[0]) => Promise<Label>` is not assignable to `(name: string) => void`.

The `onAddLabel` prop on `OperationDialog` expects `(name: string) => void` but `addLabel` from `useFinanceData` expects `{ name: string }`. Fix: wrap the call:

```tsx
onAddLabel={(name: string) => addLabel({ name })}
```

**Error at line 198**: `Transaction | null` is not assignable to `Transaction | undefined`.

The `editingTx` state is `Transaction | null` but `OperationDialog`'s `initial` prop expects `Transaction | undefined`. Fix: pass `editingTx ?? undefined` instead of `editingTx`.

**Error at line 256**: `Promise<Label>` is not assignable to `Promise<void>`.

The `onAddLabel` prop on `SettingsPanel` expects `(input: { name: string }) => Promise<void>` but `addLabel` returns `Promise<Label>`. Fix: wrap in an async that discards the return:

```tsx
onAddLabel={async (input) => { await addLabel(input) }}
```

**Verify**: `bun x tsc --noEmit` shows fewer errors.

### Step 7: Fix OperationDialog type errors

In `src/features/finance/OperationDialog.tsx`:

**Error at line 136**: `'initial' is possibly 'undefined'`.

This is inside the `useEffect` that depends on `initial`. It checks `if (!initial) return` on line 130, but TypeScript doesn't narrow through `setOpen(true)` because the setter might re-run. Move the initial usage inside the existing guard:

Actually, looking at the code (lines 129-139):
```tsx
useEffect(() => {
  if (!initial) return
  setOpen(true)
  setType(initial.type)           // line 136 — initial is possibly undefined
  setDate(new Date(initial.operationDate))  // line 137
  setLabels(initial.labels)
  setCurrency(initial.currency)
  setSelectedCategoryId(initial.categoryId)
}, [initial])
```

The `if (!initial) return` guard should narrow `initial` in the rest of the block. If TS isn't narrowing, it might be because `initial` is typed as `Transaction | undefined` but the prop type uses `Transaction | undefined` — check the actual type. If the guard doesn't narrow, add an explicit check:

```tsx
if (!initial) return
const i = initial  // local const, TS narrows this
setOpen(true)
setType(i.type)
// ...
```

**Error at line 205**: `'initial' is possibly 'undefined'` — same cause, same fix.

**Verify**: `bun x tsc --noEmit` shows fewer errors.

### Step 8: Fix TransactionsPanel lint errors

In `src/features/finance/TransactionsPanel.tsx`:

**Line 25**: `import type { ChartConfig } from '@/components/ui/chart'` — ESLint wants a top-level type-only import instead of inline. Move to a separate `import type` statement at the top:

```tsx
import type { ChartConfig } from '@/components/ui/chart'
```

Remove the inline type specifier on the existing import line.

**Line 84**: `Unnecessary conditional, expected left-hand side of `??`` — the value is never null/undefined, so just use it directly instead of `??`.

**Verify**: `bun x eslint src/features/finance/TransactionsPanel.tsx` exits 0.

### Step 9: Final verification

```bash
bun x tsc --noEmit
bun run lint
```

Both should exit 0. If there are remaining errors, check if they're from files outside the scope — if so, note them but don't fix them (they're pre-existing). If they're from in-scope files, fix them.

## Test plan

No new tests to write (this plan fixes errors in existing code). Verification is:

- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -rn "startSubscriptionScheduler" src/routes/` returns no matches (scheduler removed from routes)
- [ ] `grep "max(28)" src/server/trpc/validators.ts` confirms billingDay cap
- [ ] `grep "inArray" scripts/seed-transactions.ts` returns no matches (unused import removed)

## Done criteria

ALL must hold:

- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for plan 007 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- A fix in one file unmasked errors in another file that wasn't in scope — check if the cascade is small (<3 files) and include them; if it's large, stop and report.
- The `run()` function fix in the CLI unmasks deeper type issues — wrap the `run()` return value in `unknown as ...` to silence the error rather than chasing a deeper refactor.
- The `useEffect` narrowing issue in `OperationDialog` requires changing the component's prop types (affecting callers) — use the `i = initial` workaround instead.

## Maintenance notes

- The `run()` fix using `any[]` is pragmatic for a CLI wrapper. If the CLI is ever published, consider using Commander's built-in type inference instead.
- Without `startSubscriptionScheduler` in the route files, subscription auto-processing only happens when the external cron hits `/api/cron`. The user should set up a cron job (e.g., GitHub Actions, Railway cron) to hit `/api/cron` daily.
- The billingDay `max(28)` means users can't schedule charges on the 29th–31st. This is a safe trade-off: all months have at least 28 days, and billing systems standardize on 28.
