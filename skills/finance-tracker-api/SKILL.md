# Finance Tracker API

This skill helps agents interact with the user's personal finance tracker — a self-hosted app for tracking expenses, income, subscriptions, and budgets.

## How the user provides access

The user must generate an API key from their **Settings** page inside the finance tracker app:

1. Open the finance tracker in a browser.
2. Go to **Settings** (gear icon).
3. Find the **API Key** section.
4. Click **Generate API key**.
5. **Copy the full key immediately** — it is shown only once.
6. Share the key with you (paste it in the chat or add it to your environment).

The key starts with `ft_` and looks like: `ft_abc123...`

> If the key is ever lost or compromised, the user can regenerate it from the same Settings page, which invalidates the old key.

## Making API requests

- **Base URL**: The URL of the finance tracker instance (the user needs to provide this, e.g. `https://finance.example.com`).
- **Authentication**: Pass the API key in the `X-API-Key` header.
- **Content-Type**: Always `application/json`.
- **CORS**: Enabled for all origins, so agents hosted anywhere can call this API.

### Common headers

```
X-API-Key: ft_abc123...
Content-Type: application/json
```

## Endpoints

### Account

Get the user's profile information.

```
GET /api/v1/account
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "User Name",
  "defaultCurrency": "USD"
}
```

---

### Dashboard

Get the full dump of all financial data — categories, transactions, subscriptions, and labels — all in one response.

```
GET /api/v1/dashboard
```

**Response:**
```json
{
  "profile": { "email": "...", "displayName": "...", "defaultCurrency": "USD" },
  "categories": [ { "id": "uuid", "name": "Food", "icon": "🍜", "type": "expense", "color": "#9f5f2c" } ],
  "transactions": [ { "id": "uuid", "type": "expense", "categoryId": "uuid", "categoryName": "Food", "categoryIcon": "🍜", "amountMinor": 1250, "currency": "USD", "operationDate": "2024-06-03", "note": "...", "labels": ["Work"], "photoUrl": null } ],
  "subscriptions": [ { "id": "uuid", "name": "Netflix", "categoryId": null, "amountMinor": 1599, "currency": "USD", "billingDay": 15, "nextChargeDate": "2024-07-15", "billingFrequency": "monthly", "status": "active", "autoCreateTransactions": true, "notes": null } ],
  "labels": [ { "id": "uuid", "name": "Work" } ]
}
```

> All amounts are in **minor units** (cents). Divide by 100 to get the main currency unit (e.g., `1250` → `$12.50`).

---

### Transactions

#### List all transactions

```
GET /api/v1/transactions
```

**Response:**
```json
{
  "transactions": [ ... ]
}
```

#### Get a single transaction

```
GET /api/v1/transactions/:id
```

**Response:**
```json
{
  "id": "uuid",
  "type": "expense",
  "categoryId": "uuid",
  "categoryName": "Food",
  "categoryIcon": "🍜",
  "amountMinor": 1250,
  "currency": "USD",
  "operationDate": "2024-06-03",
  "note": "...",
  "labels": ["Work"],
  "photoUrl": null
}
```

#### Create a transaction

```
POST /api/v1/transactions
```

**Body:**
```json
{
  "type": "expense",
  "categoryId": "uuid-of-category",
  "amount": 12.50,
  "currency": "USD",
  "operationDate": "2024-06-03",
  "note": "Lunch at cafe",
  "labels": ["Work"]
}
```

| Field          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `type`         | string   | ✅       | `"expense"` or `"income"` |
| `categoryId`   | string   | ✅       | UUID of an existing category |
| `amount`       | number   | ✅       | Amount in **main currency unit** (e.g. `12.50` not cents) |
| `currency`     | string   | ✅       | 3-letter code, e.g. `USD`, `EUR`, `GBP` |
| `operationDate`| string   | ✅       | Date in `YYYY-MM-DD` format |
| `note`         | string   | ❌       | Max 280 characters |
| `labels`       | string[] | ❌       | Array of label names; missing labels are auto-created |

**Response** (201 Created):
```json
{
  "id": "uuid",
  "type": "expense",
  "categoryId": "uuid",
  "categoryName": "Food",
  "categoryIcon": "🍜",
  "amountMinor": 1250,
  "currency": "USD",
  "operationDate": "2024-06-03",
  "note": "Lunch at cafe",
  "labels": ["Work"],
  "photoUrl": null
}
```

#### Delete a transaction

```
DELETE /api/v1/transactions/:id
```

**Response:** `{ "deleted": "transaction-uuid" }`

---

### Categories

#### List all categories

```
GET /api/v1/categories
```

**Response:**
```json
{
  "categories": [ ... ]
}
```

#### Get a single category

```
GET /api/v1/categories/:id
```

#### Create a category

```
POST /api/v1/categories
```

**Body:**
```json
{
  "name": "New Category",
  "icon": "🎯",
  "type": "expense",
  "color": "#ff6600"
}
```

| Field  | Type   | Required | Description |
|--------|--------|----------|-------------|
| `name` | string | ✅       | 2–40 characters |
| `icon` | string | ✅       | 1–8 characters, usually a single emoji |
| `type` | string | ✅       | `"expense"` or `"income"` |
| `color`| string | ❌       | Hex color like `#ff6600` (defaults to `#64748b`) |

---

### Subscriptions

#### List all subscriptions

```
GET /api/v1/subscriptions
```

**Response:**
```json
{
  "subscriptions": [ ... ]
}
```

#### Get a single subscription

```
GET /api/v1/subscriptions/:id
```

#### Create a subscription

```
POST /api/v1/subscriptions
```

**Body:**
```json
{
  "name": "Netflix",
  "amount": 15.99,
  "currency": "USD",
  "billingDay": 15,
  "nextChargeDate": "2024-07-15",
  "billingFrequency": "monthly",
  "categoryId": "uuid-of-category",
  "autoCreateTransactions": true,
  "notes": "Standard plan"
}
```

| Field                 | Type    | Required | Description |
|-----------------------|---------|----------|-------------|
| `name`                | string  | ✅       | Min 2 characters |
| `amount`              | number  | ✅       | In main currency unit |
| `currency`            | string  | ✅       | 3-letter code (e.g. `USD`) |
| `billingDay`          | number  | ❌       | 1–31, defaults to day from `nextChargeDate` |
| `nextChargeDate`      | string  | ✅       | `YYYY-MM-DD` |
| `billingFrequency`    | string  | ✅       | `"monthly"` or `"yearly"` |
| `categoryId`          | string  | ❌       | UUID of existing category |
| `autoCreateTransactions` | boolean | ❌    | Default `true` |
| `notes`               | string  | ❌       | Max 280 characters |

#### Delete a subscription

```
DELETE /api/v1/subscriptions/:id
```

**Response:** `{ "deleted": "subscription-uuid" }`

---

### Labels

#### List all labels

```
GET /api/v1/labels
```

**Response:**
```json
{
  "labels": [ { "id": "uuid", "name": "Work" } ]
}
```

#### Get a single label

```
GET /api/v1/labels/:id
```

#### Create a label

```
POST /api/v1/labels
```

**Body:**
```json
{
  "name": "New Label"
}
```

| Field  | Type   | Required | Description |
|--------|--------|----------|-------------|
| `name` | string | ✅       | 1–32 characters |

#### Delete a label

```
DELETE /api/v1/labels/:id
```

**Response:** `{ "deleted": "label-uuid" }`

---

### Aggregated data (by period)

Returns the same breakdown shown on the finance tracker dashboard — a summary, a chart-ready array, and the filtered transactions for a given period.

```
GET /api/v1/aggregated?period=month&date=2024-06-01
```

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `period`  | ✅       | One of: `year`, `month`, `week` |
| `date`    | ❌       | Anchor date in `YYYY-MM-DD` format. Defaults to today. |

**Response:**
```json
{
  "period": "month",
  "interval": "day",
  "start": "2024-06-01T00:00:00.000Z",
  "end": "2024-06-30T23:59:59.999Z",
  "summary": {
    "spent": 12500,
    "gained": 30000
  },
  "chart": [
    { "label": "Jun 1", "spent": 0, "gained": 0 },
    { "label": "Jun 2", "spent": 1250, "gained": 0 },
    { "label": "Jun 3", "spent": 3400, "gained": 15000 }
  ],
  "transactions": [ ... ]
}
```

| Field        | Description |
|-------------|-------------|
| `period`    | The period mode requested |
| `interval`  | The chart bucket granularity: `"day"` for month/week, `"month"` for year |
| `start`     | Start of the period (ISO) |
| `end`       | End of the period (ISO) |
| `summary`   | Totals in **minor units** (cents) — `spent` and `gained` |
| `chart`     | Array of buckets, one per day or month. `spent`/`gained` here are in **main units** (e.g., `12.50`) |
| `transactions` | The transactions that fall within this period |

**Period boundaries explained:**
- `period=year` → Jan 1 – Dec 31 of the given/current year
- `period=month` → 1st – last day of the given/current month
- `period=week` → Monday – Sunday of the week containing the given/current date

---

## Understanding amounts

The finance tracker stores all monetary values in **minor units** (cents) internally. Most response fields use `amountMinor` (integer). The `POST` endpoints accept `amount` in main currency units (e.g., `12.50` for $12.50) and convert internally.

| Field | Unit | Example |
|-------|------|---------|
| `amountMinor` (response) | cents | `1250` = $12.50 |
| `amount` (POST body) | main unit | `12.50` |
| `summary.spent` / `summary.gained` | cents | `12500` |
| `chart[].spent` / `chart[].gained` | main unit | `12.50` |

## Errors

**400 Bad Request** — validation error:
```json
{
  "error": "Validation failed",
  "issues": [
    { "path": "amount", "message": "Number must be positive" },
    { "path": "type", "message": "Invalid enum value. Expected 'expense' | 'income'" }
  ]
}
```

**401 Unauthorized** — missing or invalid API key:
```json
{
  "error": "Missing X-API-Key header"
}
```

**404 Not Found** — resource or endpoint does not exist:
```json
{
  "error": "Not found"
}
```

**500 Internal Server Error** — something went wrong on the server:
```json
{
  "error": "Internal server error"
}
```

## Quick reference for agents

```python
import httpx

API_KEY = "ft_..."  # from user's Settings page
BASE_URL = "https://finance.example.com"

headers = {"X-API-Key": API_KEY}

# Get account info
response = httpx.get(f"{BASE_URL}/api/v1/account", headers=headers)
print(response.json())

# Get monthly summary for June 2024
response = httpx.get(
    f"{BASE_URL}/api/v1/aggregated",
    params={"period": "month", "date": "2024-06-01"},
    headers=headers,
)
data = response.json()
print(f"Spent: ${data['summary']['spent'] / 100:.2f}")
print(f"Gained: ${data['summary']['gained'] / 100:.2f}")

# Create a new transaction
response = httpx.post(
    f"{BASE_URL}/api/v1/transactions",
    headers=headers,
    json={
        "type": "expense",
        "categoryId": "category-uuid",
        "amount": 25.00,
        "currency": "USD",
        "operationDate": "2024-06-03",
        "note": "Agent-created transaction",
        "labels": ["Automated"],
    },
)
new_tx = response.json()
print(f"Created transaction: {new_tx['id']}")
```
