# Finance Tracker HTTP API

Allows agents to read and write the user's personal finance data (transactions, subscriptions, categories, labels) via a REST API at `/api/v1/*`.

## Where the user gets the API key

The user must generate one from **Settings → API Key** inside the finance tracker app. The key starts with `ft_` and is shown **only once** at generation. If lost, the user can regenerate from the same page (invalidates the old key).

## Making requests

- **Base URL**: whatever the user's instance runs at (e.g. `https://finance.example.com`).
- **Auth**: pass `X-API-Key: ft_...` header.
- **Content-Type**: `application/json`.
- **CORS**: enabled for all origins.

## Endpoints

### Account

```
GET /api/v1/account
```

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "User Name",
  "defaultCurrency": "USD"
}
```

### Dashboard (full dump)

```
GET /api/v1/dashboard
```

Returns `profile`, `categories`, `transactions`, `subscriptions`, `labels` in one response.

### Transactions

```
GET /api/v1/transactions
GET /api/v1/transactions/:id
POST /api/v1/transactions
DELETE /api/v1/transactions/:id
```

**POST body:**
| Field | Required | Type | Description |
|---|---|---|---|
| `type` | ✅ | string | `"expense"` or `"income"` |
| `categoryId` | ✅ | string | UUID of existing category |
| `amount` | ✅ | number | In main currency unit, e.g. `12.50` |
| `currency` | ✅ | string | 3-letter code, e.g. `USD` |
| `operationDate` | ✅ | string | `YYYY-MM-DD` |
| `note` | ❌ | string | Max 280 chars |
| `labels` | ❌ | string[] | Auto-created if missing |

### Categories

```
GET /api/v1/categories
GET /api/v1/categories/:id
POST /api/v1/categories
```

**POST body:**
| Field | Required | Type |
|---|---|---|
| `name` | ✅ | string (2-40 chars) |
| `icon` | ✅ | string, usually an emoji |
| `type` | ✅ | `"expense"` or `"income"` |
| `color` | ❌ | Hex color, e.g. `#ff6600` |

### Subscriptions

```
GET /api/v1/subscriptions
GET /api/v1/subscriptions/:id
POST /api/v1/subscriptions
DELETE /api/v1/subscriptions/:id
```

**POST body:**
| Field | Required | Description |
|---|---|---|
| `name` | ✅ | Min 2 chars |
| `amount` | ✅ | In main currency unit |
| `currency` | ✅ | 3-letter code |
| `nextChargeDate` | ✅ | `YYYY-MM-DD` |
| `billingFrequency` | ❌ | `"monthly"` or `"yearly"` (default monthly) |
| `categoryId` | ❌ | UUID |
| `billingDay` | ❌ | 1-31 |
| `autoCreateTransactions` | ❌ | Boolean, default `true` |
| `notes` | ❌ | Max 280 chars |

### Labels

```
GET /api/v1/labels
GET /api/v1/labels/:id
POST /api/v1/labels
DELETE /api/v1/labels/:id
```

**POST body:** `{ "name": "string (1-32 chars)" }`

### Aggregated data

```
GET /api/v1/aggregated?period=month&date=2024-06-01
```

`period` is required (`year`, `month`, or `week`). `date` is optional (defaults to today).

Returns:
```json
{
  "period": "month",
  "interval": "day",
  "start": "2024-06-01T00:00:00.000Z",
  "end": "2024-06-30T23:59:59.999Z",
  "summary": { "spent": 12500, "gained": 30000 },
  "chart": [
    { "label": "Jun 1", "spent": 0, "gained": 0 }
  ],
  "transactions": []
}
```

`summary.spent` / `summary.gained` are in **cents**. `chart[].spent` / `chart[].gained` are in **main units** (e.g. `12.50`).

## Important: amounts

| Field | Unit | Example |
|---|---|---|
| `amountMinor` (responses) | cents | `1250` = $12.50 |
| `amount` (POST body) | main unit | `12.50` |
| `summary.spent/gained` | cents | `12500` |
| `chart[].spent/gained` | main unit | `12.50` |

## Errors

- **400** — validation errors with `issues[]` array
- **401** — missing or invalid `X-API-Key`
- **404** — resource not found
- **500** — server error

All errors return `{ "error": "...", "issues?": [...] }`.

## Examples (curl)

```bash
# Account
curl -H "X-API-Key: ft_abc" https://finance.example.com/api/v1/account

# Dashboard
curl -H "X-API-Key: ft_abc" https://finance.example.com/api/v1/dashboard

# List transactions
curl -H "X-API-Key: ft_abc" https://finance.example.com/api/v1/transactions

# Create a transaction
curl -H "X-API-Key: ft_abc" \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","categoryId":"uuid","amount":12.50,"currency":"USD","operationDate":"2024-06-03","note":"Lunch","labels":["Work"]}' \
  https://finance.example.com/api/v1/transactions

# Aggregated
curl -H "X-API-Key: ft_abc" \
  "https://finance.example.com/api/v1/aggregated?period=month&date=2024-06-01"
```
