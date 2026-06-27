---
name: finance-tracker-api
description: |
  Interact with a personal finance tracker app (finance.serhiifotex.dev) — read, create, update, and delete
  transactions, categories, subscriptions, and labels, and get aggregated financial
  summaries by period (week, month, year). Use this skill whenever the user asks you
  to manage their finances, pull spending reports, create or edit expenses and income,
  list or modify subscriptions, add categories or labels, or run any financial data
  operation. Provides both a REST API reference (curl/HTTP) and a local CLI wrapper
  (`finances-cli`). Pick whichever is more convenient — both use the same API key auth.
  Covers full CRUD for all resources plus period-based aggregation with chart data.
---

# Finance Tracker API

This skill helps agents interact with the user's personal finance tracker. You can use either **raw HTTP requests** (curl, fetch, httpx) or the **`finances-cli` wrapper** — pick whichever is easier in your environment. Both use the same auth.

## Getting the API key

The user must generate one from **Settings → API Key** inside the finance tracker app. The key starts with `ft_` and is shown **only once** at generation. If lost, the user can regenerate from the same page (invalidates the old key).

## Basics

- **Base URL**: `https://finance.serhiifotex.dev`
- **Auth**: pass `X-API-Key: ft_...` header.
- **Content-Type**: always `application/json`.
- **CORS**: enabled for all origins — agents hosted anywhere can call it.
- **Amounts** are in **cents** in responses (`amountMinor: 1250` = $12.50), but **main units** in POST bodies (`amount: 12.50`).

---

## Quick HTTP reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/account` | Profile info (id, email, displayName, defaultCurrency) |
| `GET` | `/api/v1/dashboard` | Full dump — all categories, transactions, subscriptions, labels, wishlist |
| `GET` | `/api/v1/transactions` | List transactions |
| `GET` | `/api/v1/transactions/:id` | Get one transaction |
| `POST` | `/api/v1/transactions` | Create a transaction |
| `PUT` | `/api/v1/transactions/:id` | Update a transaction |
| `DELETE` | `/api/v1/transactions/:id` | Delete a transaction |
| `GET` | `/api/v1/categories` | List categories |
| `GET` | `/api/v1/categories/:id` | Get one category |
| `POST` | `/api/v1/categories` | Create a category |
| `GET` | `/api/v1/subscriptions` | List subscriptions |
| `GET` | `/api/v1/subscriptions/:id` | Get one subscription |
| `POST` | `/api/v1/subscriptions` | Create a subscription |
| `PUT` | `/api/v1/subscriptions/:id` | Update a subscription |
| `DELETE` | `/api/v1/subscriptions/:id` | Delete a subscription |
| `GET` | `/api/v1/labels` | List labels |
| `GET` | `/api/v1/labels/:id` | Get one label |
| `POST` | `/api/v1/labels` | Create a label |
| `DELETE` | `/api/v1/labels/:id` | Delete a label |
| `GET` | `/api/v1/wishlist` | List wishlist items |
| `GET` | `/api/v1/wishlist/:id` | Get one wishlist item |
| `POST` | `/api/v1/wishlist` | Create a wishlist item |
| `PUT` | `/api/v1/wishlist/:id` | Update a wishlist item (including mark bought + create tx) |
| `DELETE` | `/api/v1/wishlist/:id` | Delete a wishlist item |
| `GET` | `/api/v1/aggregated?period=month&date=2024-06-01` | Summary + chart points + transactions for a period (`year`, `month`, or `week`; `date` defaults to today) |
| `GET` | `/api/v1/exchange-rates` | Latest exchange rates (base USD, map of quote→rate) |

POST bodies use the same field names as the CLI flags below. The aggregated endpoint returns `summary.spent/gained` in cents, `chart[].spent/gained` in main units.

---

## CLI wrapper (`finances-cli`)

The package lives at `packages/finances-cli/` in the project. Not yet published to npm, so run locally:

```bash
cd path/to/finance-tracker
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- <command>
```

### Config

| Flag | Env var | Default | Description |
|---|---|---|---|
| `-k, --api-key <key>` | `FINANCES_API_KEY` | — | API key from Settings page |
| `-u, --url <url>` | `FINANCES_URL` | `https://finance.serhiifotex.dev` | Instance base URL |
| `-p, --pretty` | — | off | Pretty-print (default is JSON for agents) |

### Commands

**account** — `finances-cli account` — profile info

**dashboard** — `finances-cli dashboard` — full data dump

**transactions**
```
finances-cli transactions list
finances-cli transactions get <id>
finances-cli transactions create [options]
finances-cli transactions update <id> [options]
finances-cli transactions delete <id>
```
`create` options: `-t --type` (required), `-c --category-id` (required), `-a --amount` (required), `-C --currency` (required), `-d --date` (required), `-n --note`, `-l --labels` (comma-separated)
`update` options: same as create but all optional

**categories**
```
finances-cli categories list
finances-cli categories get <id>
finances-cli categories create [options]
```
`create` options: `-n --name` (required), `-i --icon` (required), `-t --type` (required), `-c --color`

**subscriptions**
```
finances-cli subscriptions list
finances-cli subscriptions get <id>
finances-cli subscriptions create [options]
finances-cli subscriptions update <id> [options]
finances-cli subscriptions delete <id>
```
`create` options: `-n --name` (required), `-a --amount` (required), `-C --currency` (required), `-d --next-charge-date` (required), `-f --frequency`, `-c --category-id`, `-b --billing-day`, `-o --notes`, `--no-auto`
`update` options: same as create but all optional

**labels**
```
finances-cli labels list
finances-cli labels get <id>
finances-cli labels create [options]
finances-cli labels delete <id>
```
`create` options: `-n --name` (required)

**wishlist**
```
finances-cli wishlist list
finances-cli wishlist get <id>
finances-cli wishlist create [options]
finances-cli wishlist update <id> [options]
finances-cli wishlist delete <id>
```
`create` options: `-t --title` (required), `-d --description`, `-i --image-url`, `-u --url`, `-p --planned-date`, `-a --amount`, `-C --currency`, `-c --category-id`
`update` options: same as create plus `--bought` (mark as bought), `--create-tx` (create transaction when marking bought)

**aggregated**
```
finances-cli aggregated --period <period> [--date <date>]
```
`-p --period` (required: year, month, week), `-d --date` (optional: YYYY-MM-DD)

**exchange-rates**
```
finances-cli exchange-rates
```
Returns latest rates (base USD, map of quote→rate).

### Output

Every command prints JSON to stdout. Errors go to stderr as `{"error": "..."}`.

```bash
# Get dashboard
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- dashboard

# Monthly summary
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- aggregated --period month --date 2024-06-01

# Create a transaction
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- \
  transactions create \
    --type expense \
    --category-id uuid \
    --amount 12.50 \
    --currency USD \
    --date 2024-06-03 \
    --note "Lunch" \
    --labels Work,Food
```
