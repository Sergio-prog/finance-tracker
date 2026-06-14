# Plan 005: Add budgets and spending limits

> **Executor instructions**: This is a **design/spike plan** — it produces a
> working prototype with open questions logged in the code. Not a production
> build-everything plan. Follow each step, verify as you go, and document any
> unknowns in a `BUDGETS_OPEN_QUESTIONS.md` file if you hit ambiguity.
>
> Run every verification command before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise.
> When done, update the status row for this plan in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat d3d7ba8..HEAD -- src/server/db/schema.ts src/server/trpc/ src/routes/api.v1.$.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `d3d7ba8`, 2026-06-15

## Why this matters

Budgeting is a core personal finance feature. The data model already supports it: categories with `type: 'expense'`, transactions with `amountMinor`, `operationDate`, and `categoryId`. Adding a `budgets` table (category + limit + period) and a progress indicator in the dashboard lets users see spending vs. limits at a glance. The README roadmap lists "Budgets and spending limits" as a planned feature.

## Current state

The relevant existing patterns:

**Schema** (`src/server/db/schema.ts`):
- Categories are `userId + name + type + icon + color`
- Transactions have `userId + categoryId + amountMinor + operationDate`
- Tables use `uuid` primary keys, `references()`, and `index()`/`uniqueIndex()`

**Repository** (`src/server/trpc/repository.ts`):
- Functions follow the pattern: accept `(user: AuthUser, input: z.infer<typeof X>)`, call `assertDatabase()`, use `db.insert/update/delete`, return typed objects
- All functions are async, wrapped in try/catch at the router level
- `getDashboard()` returns everything; new functions are individual

**Router** (`src/server/trpc/router.ts`):
- Authenticated procedures use `authenticatedProcedure.query(...)` or `.mutation(...)`
- `.input()` wraps a zod schema before the handler

**REST API** (`src/routes/api.v1.$.ts`):
- Switch on `resource` name, then check `request.method`, call repository, return `json()`

Example of a new table's CRUD (follow `labels` pattern — it's the simplest):

```ts
// schema: labels
export const labels = pgTable('labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('labels_user_name_idx').on(table.userId, table.name),
])

// repository: createLabel
export async function createLabel(user: AuthUser, input: z.infer<typeof labelInput>): Promise<Label> {
  const database = assertDatabase()
  const [created] = await database.insert(labelsTable).values({ userId: user.id, name: input.name.trim() }).returning()
  return { id: created.id, name: created.name }
}
```

## Commands you will need

| Purpose      | Command                  | Expected on success |
|--------------|--------------------------|---------------------|
| Install      | `bun install`            | exit 0              |
| Generate migration | `bun run db:generate` | exit 0, new .sql file in `drizzle/` |
| Typecheck    | `bun x tsc --noEmit`     | exit 0              |
| Lint         | `bun run lint`           | exit 0              |

## Scope

**In scope**:
- `src/server/db/schema.ts` — add `budgets` table
- `src/server/db/client.ts` — no changes (schema auto-registers via import)
- `src/server/trpc/types.ts` — add `Budget` type
- `src/server/trpc/validators.ts` — add `budgetInput` and `budgetUpdate` zod schemas
- `src/server/trpc/repository.ts` — add CRUD functions + spending computation
- `src/server/trpc/router.ts` — add tRPC endpoints
- `src/routes/api.v1.$.ts` — add REST API endpoints
- `src/features/finance/BudgetsPanel.tsx` — new UI panel
- `src/features/finance/FinanceApp.tsx` — add Budgets nav tab
- `src/features/finance/useFinanceData.ts` — add budget actions

**Out of scope**:
- Rollover budgets (unused limit carries to next period)
- Alerts when exceeding budget (that's a future notification extension)
- Income budgets (budgets apply to `expense` categories only)
- Editing budgets via the REST API CLI

## Git workflow

- Branch: `advisor/005-budgets`
- Commit style: conventional commits, e.g.:
  1. `feat(db): add budgets table schema and migration`
  2. `feat(api): add budget CRUD to tRPC router and repository`
  3. `feat(api): add budget REST API endpoints`
  4. `feat(ui): add BudgetsPanel and wire into FinanceApp`
- Do NOT push or open a PR unless told to.
- Do NOT run `db:migrate` — that's a side-effectful operation. Write the migration and tell the user to run it.

## Steps

### Step 1: Add budgets table to schema

Add to `src/server/db/schema.ts`:

```ts
export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    amountLimit: integer('amount_limit').notNull(), // in minor units (cents)
    period: text('period').notNull().default('monthly'), // 'monthly' | 'yearly'
    startDate: text('start_date').notNull(), // YYYY-MM-DD string
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('budgets_user_category_idx').on(table.userId, table.categoryId),
  ],
)
```

**Important**: Do NOT run `bun run db:generate` or `bun run db:migrate`. The executor must write the migration file manually or skip it — tell the user to run `bun run db:generate && bun run db:migrate` after the code is written.

### Step 2: Add Budget type to types.ts

Add to `src/server/trpc/types.ts`:

```ts
export type Budget = {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  amountLimit: number        // minor units (cents)
  period: 'monthly' | 'yearly'
  startDate: string          // YYYY-MM-DD
}
```

Also add a `BudgetWithSpending` type for the UI:

```ts
export type BudgetWithSpending = Budget & {
  spent: number  // minor units spent so far in the current period
  percentage: number // 0-100, how much of the limit is used
}
```

### Step 3: Add validators

Add to `src/server/trpc/validators.ts`:

```ts
export const budgetInput = z.object({
  categoryId: z.string().min(1),
  amountLimit: z.coerce.number().positive(),
  period: z.enum(['monthly', 'yearly']).default('monthly'),
  startDate: z.string().min(10),
})

export const budgetUpdate = z.object({
  id: z.string().min(1),
  amountLimit: z.coerce.number().positive().optional(),
  period: z.enum(['monthly', 'yearly']).optional(),
  startDate: z.string().min(10).optional(),
})
```

### Step 4: Add repository CRUD

In `src/server/trpc/repository.ts`, add the following functions:

**`createBudget`**:
```ts
export async function createBudget(
  user: AuthUser,
  input: z.infer<typeof budgetInput>,
): Promise<Budget> {
  const database = assertDatabase()
  const [category] = await database
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, input.categoryId))
    .limit(1)

  if (!category) throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' })

  const [created] = await database
    .insert(budgetsTable)
    .values({
      userId: user.id,
      categoryId: input.categoryId,
      amountLimit: Math.round(input.amountLimit * 100),
      period: input.period,
      startDate: input.startDate,
    })
    .returning()

  return {
    id: created.id,
    categoryId: created.categoryId!,
    categoryName: category.name,
    categoryIcon: category.icon,
    amountLimit: created.amountLimit,
    period: created.period as 'monthly' | 'yearly',
    startDate: created.startDate,
  }
}
```

**`getBudgets`** — list all budgets for the user with computed spending:

```ts
export async function getBudgets(user: AuthUser): Promise<BudgetWithSpending[]> {
  const database = assertDatabase()
  const rows = await database
    .select()
    .from(budgetsTable)
    .where(eq(budgetsTable.userId, user.id))

  if (rows.length === 0) return []

  const categoryIds = rows.map((r) => r.categoryId!)
  const categories = await database
    .select()
    .from(categoriesTable)
    .where(inArray(categoriesTable.id, categoryIds))

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const now = new Date()
  const periodStart = now.toISOString().slice(0, 7) + '-01' // first of current month

  const result: BudgetWithSpending[] = []

  for (const row of rows) {
    const cat = categoryMap.get(row.categoryId!)
    const { spent } = await computeBudgetSpending(database, user.id, row)

    result.push({
      id: row.id,
      categoryId: row.categoryId!,
      categoryName: cat?.name ?? 'Unknown',
      categoryIcon: cat?.icon ?? '•',
      amountLimit: row.amountLimit,
      period: row.period as 'monthly' | 'yearly',
      startDate: row.startDate,
      spent,
      percentage: row.amountLimit > 0 ? Math.min(100, Math.round((spent / row.amountLimit) * 100)) : 0,
    })
  }

  return result
}
```

**`computeBudgetSpending`** — helper that sums transactions for a budget's category and period:

```ts
async function computeBudgetSpending(
  database: ReturnType<typeof assertDatabase>,
  userId: string,
  budget: typeof budgetsTable.$inferSelect,
): Promise<{ spent: number }> {
  const periodStart = budget.startDate
  const today = new Date().toISOString().slice(0, 10)

  const rows = await database
    .select({ spent: sum(transactionsTable.amountMinor) })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.categoryId, budget.categoryId!),
        eq(transactionsTable.type, 'expense'),
        gte(transactionsTable.operationDate, periodStart),
        lte(transactionsTable.operationDate, today),
      ),
    )
    .limit(1)

  return { spent: rows[0]?.spent ?? 0 }
}
```

**Note**: `sum` and `inArray`, `gte`, `lte` need to be imported from `drizzle-orm`. Add them to the existing import line.

**`deleteBudget`**, **`updateBudget`** — follow the pattern from `deleteLabel` / `updateTransaction`.

### Step 5: Register tRPC endpoints

In `src/server/trpc/router.ts`, add:

```ts
import { budgetInput, budgetUpdate } from './validators'

// Inside appRouter:
getBudgets: authenticatedProcedure.query(({ ctx }) => getBudgets(ctx.user)),
createBudget: authenticatedProcedure
  .input(budgetInput)
  .mutation(({ ctx, input }) => createBudget(ctx.user, input)),
updateBudget: authenticatedProcedure
  .input(budgetUpdate)
  .mutation(({ ctx, input }) => updateBudget(ctx.user, input)),
deleteBudget: authenticatedProcedure
  .input(z.object({ id: z.string().min(1) }))
  .mutation(({ ctx, input }) => deleteBudget(ctx.user, input.id)),
```

### Step 6: Add REST API endpoints

In `src/routes/api.v1.$.ts`, add a `case 'budgets':` block inside the switch:

```ts
case 'budgets': {
  if (request.method === 'GET') {
    const budgets = await getBudgets(user)
    return json({ budgets })
  }
  if (request.method === 'POST') {
    const body = await request.json()
    const validated = budgetInput.parse(body)
    const created = await createBudget(user, validated)
    return json(created, 201)
  }
  if (request.method === 'PUT' && id) {
    const body = await request.json()
    const validated = budgetUpdate.parse({ ...body, id })
    const updated = await updateBudget(user, validated)
    return json(updated)
  }
  if (request.method === 'DELETE' && id) {
    await deleteBudget(user, id)
    return json({ deleted: id })
  }
  break
}
```

Import `getBudgets`, `createBudget`, `updateBudget`, `deleteBudget` and `budgetInput`, `budgetUpdate` at the top.

### Step 7: Create BudgetsPanel UI

Create `src/features/finance/BudgetsPanel.tsx`:

A panel that shows each budget as a card with:
- Category icon + name
- Amount limit formatted (e.g. "$500.00")
- Spent so far formatted (e.g. "$320.50")
- A progress bar showing percentage consumed
- Color coding: green (<75%), amber (75-90%), red (>90%)
- Floating "Add budget" button to create a new budget via a dialog

Follow the existing panel patterns (`SubscriptionsPanel`, `TransactionsPanel`). Import `Badge` for the progress bar area.

Use a simple HTML `<progress>` element or a Tailwind `bg-muted` + `bg-primary` div for the bar:

```tsx
<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
  <div
    className="h-full rounded-full transition-all"
    style={{
      width: `${Math.min(100, budget.percentage)}%`,
      backgroundColor: budget.percentage > 90
        ? 'var(--color-destructive)'
        : budget.percentage > 75
          ? '#f59e0b'
          : 'var(--color-primary)',
    }}
  />
</div>
```

The dialog for creating/editing a budget should:
- Let the user pick a category (expense categories only)
- Set the amount limit
- Set the period (monthly/yearly)
- And a start date (defaults to first of current month)

Follow `OperationDialog.tsx` or `SubscriptionDialog.tsx` as the structural pattern — a `Sheet` (bottom drawer) with form fields.

### Step 8: Wire BudgetsPanel into FinanceApp

In `src/features/finance/FinanceApp.tsx`:

1. Import `Budget` icon from `lucide-react` (use `PiggyBank` or `CircleDollarSign`)
2. Add a `NavItem` for the budget tab in the sidebar:
```tsx
<NavItem value="budgets" icon={<PiggyBank />}>
  Budgets
</NavItem>
```
3. Add a `TabsContent` for budgets:
```tsx
<TabsContent value="budgets" className="m-0">
  {error ? (
    <StatusMessage message={error} />
  ) : (
    <BudgetsPanel
      categories={categories}
      budgets={[]} // will be loaded from tRPC
      onCreateBudget={createBudget}
      onUpdateBudget={updateBudget}
      onDeleteBudget={deleteBudget}
    />
  )}
</TabsContent>
```
4. Add the mobile nav tab item in the bottom nav.
5. Add the needed actions to `useFinanceData` hook (fetch budgets, create/update/delete).

### Step 9: Add budget actions to useFinanceData

In `src/features/finance/useFinanceData.ts`:

```ts
const createBudget = async (input: /* BudgetInput type */) => {
  const created = await trpc.createBudget.mutate(input)
  // update local state
}
```

Follow the existing pattern for `addCategory` (which adds to an array and returns the created item). You'll need a `budgets` state array similar to `categories`.

### Step 10: Verify

```bash
bun x tsc --noEmit
bun run lint
```

Fix any issues.

## Test plan

Manual verification:

- [ ] Budgets tab appears in sidebar and mobile nav
- [ ] "Add budget" button opens the dialog
- [ ] Only expense categories are shown in the category picker
- [ ] Creating a budget shows it in the panel with 0% spent
- [ ] Adding transactions to the budget's category updates the percentage
- [ ] Progress bar colors match thresholds (<75% green, 75-90% amber, >90% red)
- [ ] Editing a budget updates the limit and/or period
- [ ] Deleting a budget removes it from the panel
- [ ] REST API `GET /api/v1/budgets` returns the list

## Done criteria

Machine-checkable:

- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -rn "budgets" src/server/db/schema.ts` returns a match (table definition)
- [ ] `grep -rn "Budget" src/server/trpc/types.ts` returns matches
- [ ] `grep -rn "budgetInput\|budgetUpdate" src/server/trpc/validators.ts` returns matches
- [ ] `src/features/finance/BudgetsPanel.tsx` exists
- [ ] `grep -rn "budgets" src/features/finance/FinanceApp.tsx` returns matches
- [ ] No files outside the in-scope list are modified

## User setup required

After the code is written, the user must run:
```bash
bun run db:generate && bun run db:migrate
```
This creates the `budgets` table schema in the database.

## STOP conditions

Stop and report back (do not improvise) if:

- The Drizzle `sum` aggregate is not available in `drizzle-orm` — use a manual query or `sql` template literal instead.
- `inArray` is not imported — add it from `drizzle-orm` (it's available).
- The `BudgetWithSpending` type's `percentage` calculation results in `NaN` — guard with `amountLimit > 0 ? ... : 0`.
- The budget spending query is too slow — for a personal finance app with <1000 transactions, this won't be an issue.

## Maintenance notes

- Budget spending is calculated by summing transactions for the category from `startDate` to today. If a user backdates transactions before the budget's start date, those won't count.
- The `uniqueIndex on (userId, categoryId)` means one budget per category. If users want multiple limits for the same category (e.g., monthly + yearly), remove the unique constraint.
- The REST API returns `getBudgets` for `GET /api/v1/budgets` — update the skill file (`skills/finance-tracker-api/SKILL.md`) when the API is finalized.
