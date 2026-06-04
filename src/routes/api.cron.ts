import { createFileRoute } from '@tanstack/react-router'

import { startSubscriptionScheduler } from '@/server/scheduler'

startSubscriptionScheduler()

export const Route = createFileRoute('/api/cron')({
  server: {
    handlers: {
      async GET({ request }) {
        const authHeader = request.headers.get('authorization')
        const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

        if (
          !expectedSecret ||
          process.env.CRON_SECRET === 'CHANGE_ME' ||
          authHeader !== expectedSecret
        ) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          )
        }

        try {
          const { processAllSubscriptions } = await import(
            '@/server/trpc/repository'
          )
          const result = await processAllSubscriptions()

          return new Response(
            JSON.stringify({ processed: result.processed }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Internal error'

          return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
