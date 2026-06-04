# Finance Tracker API

This skill helps agents interact with the user's personal finance tracker. You can use either **raw HTTP requests** (curl, fetch, httpx) or the **`finances-cli` wrapper** — pick whichever is easier in your environment. Both use the same auth.

## Where the user gets the API key

Settings → API Key → Generate. The key starts with `ft_` and is shown **only once**. If lost, regenerate from the same page (invalidates the old key).

## Basics

- **Base URL**: depends on where the app runs (user tells you this).
- **Auth**: pass `X-API-Key: ft_...` header.
- **Content-Type**: always `application/json`.
- **CORS**: enabled for all origins.
- **Amounts** are in **cents** in responses (`amountMinor: 1250` = $12.50), but **main units** in POST bodies (`amount: 12.50`).

---

## Quick HTTP reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/account` | Profile info |
| `GET` | `/api/v1/dashboard` | Full dump (categories, transactions, subscriptions, labels) |
| `GET` | `/api/v1/transactions` | List transactions |
| `GET` | `/api/v1/transactions/:id` | Get one |
| `POST` | `/api/v1/transactions` | Create (body: `type`, `categoryId`, `amount`, `currency`, `operationDate`, optional `note`, `labels`) |
| `DELETE` | `/api/v1/transactions/:id` | Delete |
| `GET` | `/api/v1/categories` | List categories |
| `POST` | `/api/v1/categories` | Create (body: `name`, `icon`, `type`, optional `color`) |
| `GET` | `/api/v1/subscriptions` | List subscriptions |
| `POST` | `/api/v1/subscriptions` | Create (body: `name`, `amount`, `currency`, `nextChargeDate`, optional `billingFrequency`, `categoryId`, `billingDay`, `notes`, `autoCreateTransactions`) |
| `DELETE` | `/api/v1/subscriptions/:id` | Delete |
| `GET` | `/api/v1/labels` | List labels |
| `POST` | `/api/v1/labels` | Create (body: `{ "name": "..." }`) |
| `DELETE` | `/api/v1/labels/:id` | Delete |
| `GET` | `/api/v1/aggregated?period=month&date=2024-06-01` | Summary + chart points + filtered transactions for a period (`year`, `month`, or `week`; `date` defaults to today) |

Aggregated response includes `summary.spent/gained` (cents), `chart[].spent/gained` (main units), `transactions[]`.

---

## CLI wrapper (`finances-cli`)

The package lives at `packages/finances-cli/` in the project. Not yet published to npm, so run locally:

```bash
cd path/to/finance-tracker
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- <command>
```

### Auth & config

| Flag | Env var | Default | Description |
|---|---|---|---|
| `-k, --api-key <key>` | `FINANCES_API_KEY` | — | API key |
| `-u, --url <url>` | `FINANCES_URL` | `http://localhost:3000` | Base URL |
| `-p, --pretty` | — | off | Human-readable output (default is JSON) |

### Commands

**account** — `finances-cli account`

**dashboard** — `finances-cli dashboard`

**transactions**
```
finances-cli transactions list
finances-cli transactions get <id>
finances-cli transactions create [options]
finances-cli transactions delete <id>
```
`create` options: `-t --type` (required), `-c --category-id` (required), `-a --amount` (required), `-C --currency` (required), `-d --date` (required), `-n --note`, `-l --labels` (comma-separated)

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
finances-cli subscriptions delete <id>
```
`create` options: `-n --name` (required), `-a --amount` (required), `-C --currency` (required), `-d --next-charge-date` (required), `-f --frequency`, `-c --category-id`, `-b --billing-day`, `-o --notes`, `--no-auto`

**labels**
```
finances-cli labels list
finances-cli labels get <id>
finances-cli labels create [options]
finances-cli labels delete <id>
```
`create` options: `-n --name` (required)

**aggregated**
```
finances-cli aggregated --period <period> [--date <date>]
```
`-p --period` (required, one of: year, month, week), `-d --date` (optional, YYYY-MM-DD)

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
