import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { db, hasDatabase } from '@/server/db/client'
import {
  categories as categoriesTable,
  profiles as profilesTable,
} from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import {
  filterTransactionsByPeriod,
  getChartInterval,
  getPeriodBounds,
  groupTransactionsByInterval,
  summarizeTransactions,
} from '@/server/aggregations'
import {
  createCategory,
  createLabel,
  createSubscription,
  createTransaction,
  deleteLabel,
  deleteSubscription,
  deleteTransaction,
  getDashboard,
  validateApiKey,
} from '@/server/trpc/repository'
import {
  categoryInput,
  labelInput,
  subscriptionInput,
  transactionInput,
} from '@/server/trpc/validators'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'X-API-Key, Content-Type',
    },
  })
}

function jsonError(message: string, status = 400) {
  return json({ error: message }, status)
}

async function handleApiRequest(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'X-API-Key, Content-Type',
      },
    })
  }

  const apiKey =
    request.headers.get('x-api-key') ?? request.headers.get('X-API-Key')

  if (!apiKey) {
    return jsonError('Missing X-API-Key header', 401)
  }

  const user = await validateApiKey(apiKey)

  if (!user) {
    return jsonError('Invalid API key', 401)
  }

  if (!hasDatabase || !db) {
    return jsonError('Database not configured', 503)
  }

  const url = new URL(request.url)
  const path = url.pathname.replace('/api/v1/', '').replace(/\/$/, '')
  const segments = path.split('/').filter(Boolean)
  const resource = segments[0] ?? ''
  const id = segments[1]

  try {
    switch (resource) {
      case 'account': {
        if (request.method !== 'GET') break
        const profileRows = await db
          .select()
          .from(profilesTable)
          .where(eq(profilesTable.id, user.id))
          .limit(1)
        const profile = profileRows[0]
        return json({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          defaultCurrency: profile?.defaultCurrency ?? 'USD',
        })
      }

      case 'dashboard': {
        if (request.method !== 'GET') break
        const dashboard = await getDashboard(user)
        return json(dashboard)
      }

      case 'transactions': {
        const dashboard = await getDashboard(user)

        if (request.method === 'GET') {
          if (id) {
            const tx = dashboard.transactions.find((t) => t.id === id)
            if (!tx) return jsonError('Transaction not found', 404)
            return json(tx)
          }
          return json({ transactions: dashboard.transactions })
        }

        if (request.method === 'POST') {
          const body = await request.json()
          const validated = transactionInput.parse(body)
          const created = await createTransaction(user, validated)
          return json(created, 201)
        }

        if (request.method === 'DELETE' && id) {
          await deleteTransaction(user, id)
          return json({ deleted: id })
        }

        break
      }

      case 'categories': {
        const dashboard = await getDashboard(user)

        if (request.method === 'GET') {
          if (id) {
            const cat = dashboard.categories.find((c) => c.id === id)
            if (!cat) return jsonError('Category not found', 404)
            return json(cat)
          }
          return json({ categories: dashboard.categories })
        }

        if (request.method === 'POST') {
          const body = await request.json()
          const validated = categoryInput.parse(body)
          const created = await createCategory(user, validated)
          return json(created, 201)
        }

        break
      }

      case 'subscriptions': {
        const dashboard = await getDashboard(user)

        if (request.method === 'GET') {
          if (id) {
            const sub = dashboard.subscriptions.find((s) => s.id === id)
            if (!sub) return jsonError('Subscription not found', 404)
            return json(sub)
          }
          return json({ subscriptions: dashboard.subscriptions })
        }

        if (request.method === 'POST') {
          const body = await request.json()
          const validated = subscriptionInput.parse(body)
          const created = await createSubscription(user, validated)
          return json(created, 201)
        }

        if (request.method === 'DELETE' && id) {
          await deleteSubscription(user, id)
          return json({ deleted: id })
        }

        break
      }

      case 'labels': {
        const dashboard = await getDashboard(user)

        if (request.method === 'GET') {
          if (id) {
            const label = dashboard.labels.find((l) => l.id === id)
            if (!label) return jsonError('Label not found', 404)
            return json(label)
          }
          return json({ labels: dashboard.labels })
        }

        if (request.method === 'POST') {
          const body = await request.json()
          const validated = labelInput.parse(body)
          const created = await createLabel(user, validated)
          return json(created, 201)
        }

        if (request.method === 'DELETE' && id) {
          await deleteLabel(user, id)
          return json({ deleted: id })
        }

        break
      }

      case 'aggregated': {
        if (request.method !== 'GET') break

        const period = url.searchParams.get('period') as
          | 'year'
          | 'month'
          | 'week'
          | null
        const dateParam = url.searchParams.get('date')

        if (!period || !['year', 'month', 'week'].includes(period)) {
          return jsonError(
            "Invalid period. Use 'year', 'month', or 'week'.",
            400,
          )
        }

        const anchor = dateParam ? new Date(dateParam) : new Date()
        if (isNaN(anchor.getTime())) {
          return jsonError('Invalid date format', 400)
        }

        const bounds = getPeriodBounds(anchor, period)
        const interval = getChartInterval(period)
        const dashboard = await getDashboard(user)
        const filtered = filterTransactionsByPeriod(
          dashboard.transactions,
          bounds,
        )
        const summary = summarizeTransactions(filtered)
        const chart = groupTransactionsByInterval(
          filtered,
          interval,
          bounds.start,
          bounds.end,
        )

        return json({
          period,
          interval,
          start: bounds.start.toISOString(),
          end: bounds.end.toISOString(),
          summary,
          chart,
          transactions: filtered,
        })
      }
    }

    return jsonError('Not found', 404)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(
        {
          error: 'Validation failed',
          issues: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        400,
      )
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return jsonError(message, 500)
  }
}

export const Route = createFileRoute('/api/v1/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleApiRequest(request),
      POST: ({ request }) => handleApiRequest(request),
      DELETE: ({ request }) => handleApiRequest(request),
      OPTIONS: ({ request }) => handleApiRequest(request),
    },
  },
})
