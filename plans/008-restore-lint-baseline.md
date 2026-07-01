# Plan 008: Restore lint baseline (remove unnecessary non-null assertion in WishlistPanel)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat 7fbccd1..HEAD -- src/features/wishlist/WishlistPanel.tsx`
> If the file changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P0 (restores the verification baseline plan 007 established)
- **Effort**: S (one-character fix)
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx + correctness
- **Planned at**: commit `7fbccd1`, 2026-06-30

## Why this matters

Plan 007 established a clean baseline of `tsc --noEmit` and `bun run lint` both
exiting 0, so that every later change can be verified. The post-007
currency-conversion work (`7fbccd1`) reintroduced one lint error, breaking that
baseline:

```
src/features/wishlist/WishlistPanel.tsx
  302:71  error  This assertion is unnecessary since it does not change the type
                 of the expression  @typescript-eslint/no-unnecessary-type-assertion
```

Until this is fixed, `bun run lint` exits 1 for the whole repo, which makes the
"lint exits 0" done criterion of other plans noisy and unreliable. This is a
one-character fix.

## Current state

`src/features/wishlist/WishlistPanel.tsx`, lines 296-308:

```tsx
{item.amountMinor && item.currency ? (
  <span className="font-medium tabular-nums text-foreground">
    {formatMoney(item.amountMinor, item.currency)}
    {isConverted && convertedAmount !== null ? (
      <span
        className="ml-1 text-xs text-muted-foreground"
        title={`1 ${item.currency} = ${(convertedAmount / item.amountMinor!).toFixed(4)} ${mainCurrency}`}
      >
        ≈ {formatMoney(convertedAmount, mainCurrency)}
      </span>
    ) : null}
  </span>
) : null}
```

The outer ternary on line 296 already guards `item.amountMinor && item.currency`,
so inside that branch `item.amountMinor` is already narrowed to a non-null
`number`. The `!` non-null assertion on line 302 (`item.amountMinor!`) is
therefore redundant, which is exactly what the linter reports.

## Commands you will need

| Purpose   | Command                                              | Expected on success |
|-----------|------------------------------------------------------|---------------------|
| Typecheck | `bun x tsc --noEmit`                                 | exit 0, no errors   |
| Lint      | `bun run lint`                                       | exit 0 (7 pre-existing `no-shadow` warnings in `calendar.tsx`/`chart.tsx` are acceptable — see note) |
| Lint file | `bun x eslint src/features/wishlist/WishlistPanel.tsx` | exit 0, no errors |

## Scope

**In scope** (the only file you should modify):
- `src/features/wishlist/WishlistPanel.tsx` — remove the redundant `!` on line 302

**Out of scope** (do NOT touch):
- The 7 pre-existing `no-shadow` **warnings** in `src/components/ui/calendar.tsx`
  and `src/components/ui/chart.tsx` — they are warnings (not errors), predate this
  work, and are not part of restoring the baseline. Leave them.
- Any other file, any other logic change in `WishlistPanel.tsx`.

## Git workflow

- Branch: `advisor/008-restore-lint-baseline`
- Commit style: conventional commits — `fix: remove unnecessary non-null assertion in WishlistPanel`
- Do NOT push or open a PR unless told to.

## Steps

### Step 1: Remove the redundant non-null assertion

In `src/features/wishlist/WishlistPanel.tsx` line 302, change:

```tsx
        title={`1 ${item.currency} = ${(convertedAmount / item.amountMinor!).toFixed(4)} ${mainCurrency}`}
```

to (remove the `!` after `item.amountMinor`):

```tsx
        title={`1 ${item.currency} = ${(convertedAmount / item.amountMinor).toFixed(4)} ${mainCurrency}`}
```

Do not change anything else.

**Verify**: `bun x eslint src/features/wishlist/WishlistPanel.tsx` exits 0 with no
errors.

### Step 2: Full verification

```bash
bun x tsc --noEmit
bun run lint
```

`tsc` must exit 0. `bun run lint` must exit 0 — the only remaining output should
be the 7 pre-existing `no-shadow` warnings in `calendar.tsx`/`chart.tsx` (warnings
do not fail the lint run; the previous error is gone).

## Test plan

No new tests — this is a lint/type-safety fix in existing code. Verification is
the lint and typecheck commands above. Confirm the previously-reported error at
`WishlistPanel.tsx:302` no longer appears in `bun run lint` output.

## Done criteria

ALL must hold:

- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -n "amountMinor!" src/features/wishlist/WishlistPanel.tsx` returns no matches
- [ ] Only `src/features/wishlist/WishlistPanel.tsx` is modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- Removing the `!` introduces a NEW `tsc` error (it should not — the value is
  already narrowed to `number` by the line-296 guard). If it does, the type of
  `item.amountMinor` is not what this plan assumed — report the actual type.
- `bun run lint` reports errors in files other than `WishlistPanel.tsx` after the
  fix — those are out of scope; report them but do not fix them.

## Maintenance notes

- The root cause is a habit of adding `!` defensively even where a guard already
  narrows the value. The `@typescript-eslint/no-unnecessary-type-assertion` rule
  catches these; keep it on so the baseline stays clean.
