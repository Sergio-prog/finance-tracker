# Finance Tracker CLI

Agents that prefer running a local CLI over raw HTTP can use `finances-cli` — a command-line wrapper around the finance tracker REST API. Every endpoint is exposed as a subcommand with flags.

## Where the user gets the API key

The user must generate one from **Settings → API Key** inside the finance tracker app. The key starts with `ft_` and is shown **only once**. If lost, the user can regenerate from the same page.

## Running the CLI

The package lives at `packages/finances-cli/` inside the project. It is **not yet published to npm**, so run it locally:

```bash
cd path/to/finance-tracker
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- <command>
```

Once published, use via npx:

```bash
FINANCES_API_KEY=ft_abc123 npx finances-cli <command>
```

## Auth & config

| Flag | Env var | Default | Description |
|---|---|---|---|
| `-k, --api-key <key>` | `FINANCES_API_KEY` | — | API key from Settings page |
| `-u, --url <url>` | `FINANCES_URL` | `http://localhost:3000` | Base URL of the finance tracker instance |
| `-p, --pretty` | — | off | Human-readable output (default is JSON) |

## Commands

### account

```
finances-cli account
```

Returns profile info (id, email, displayName, defaultCurrency).

### dashboard

```
finances-cli dashboard
```

Full dump of categories, transactions, subscriptions, labels in one call.

### transactions

```
finances-cli transactions list
finances-cli transactions get <id>
finances-cli transactions create [options]
finances-cli transactions delete <id>
```

**`create` options:**
- `-t, --type <type>` — `"expense"` or `"income"` **(required)**
- `-c, --category-id <id>` — Category UUID **(required)**
- `-a, --amount <amount>` — Amount in main currency, e.g. `12.50` **(required)**
- `-C, --currency <code>` — 3-letter code **(required)**
- `-d, --date <date>` — `YYYY-MM-DD` **(required)**
- `-n, --note <text>` — Optional note
- `-l, --labels <labels>` — Comma-separated labels, e.g. `Work,Food`

### categories

```
finances-cli categories list
finances-cli categories get <id>
finances-cli categories create [options]
```

**`create` options:**
- `-n, --name <name>` **(required)**
- `-i, --icon <icon>` — Emoji, e.g. `🍜` **(required)**
- `-t, --type <type>` — `"expense"` or `"income"` **(required)**
- `-c, --color <color>` — Hex, e.g. `#ff6600`

### subscriptions

```
finances-cli subscriptions list
finances-cli subscriptions get <id>
finances-cli subscriptions create [options]
finances-cli subscriptions delete <id>
```

**`create` options:**
- `-n, --name <name>` **(required)**
- `-a, --amount <amount>` **(required)**
- `-C, --currency <code>` **(required)**
- `-d, --next-charge-date <date>` — `YYYY-MM-DD` **(required)**
- `-f, --frequency <freq>` — `"monthly"` or `"yearly"`
- `-c, --category-id <id>` — Category UUID
- `-b, --billing-day <day>` — 1-31
- `-o, --notes <text>` — Optional notes
- `--no-auto` — Disable auto-creating transactions

### labels

```
finances-cli labels list
finances-cli labels get <id>
finances-cli labels create [options]
finances-cli labels delete <id>
```

**`create` options:**
- `-n, --name <name>` **(required)**

### aggregated

```
finances-cli aggregated --period <period> [--date <date>]
```

- `-p, --period <period>` — `"year"`, `"month"`, or `"week"` **(required)**
- `-d, --date <date>` — `YYYY-MM-DD` (defaults to today)

## Output

Every command prints JSON to stdout by default (easy for agents to parse). Add `--pretty` for human-readable output.

```bash
FINANCES_API_KEY=ft_abc123 npx finances-cli account
# → {"id":"...","email":"...","displayName":"...","defaultCurrency":"USD"}
```

Errors go to stderr as JSON:
```json
{"error":"API key is required. Use --api-key or set FINANCES_API_KEY environment variable."}
```

## Examples

```bash
# Get dashboard
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- dashboard

# Monthly summary for June 2024
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- \
  aggregated --period month --date 2024-06-01

# Create a transaction
FINANCES_API_KEY=ft_abc123 bun run packages/finances-cli/src/index.ts -- \
  transactions create \
    --type expense \
    --category-id uuid \
    --amount 12.50 \
    --currency USD \
    --date 2024-06-03 \
    --note "Lunch at cafe" \
    --labels Work,Food
```
