let started = false

/**
 * Starts a simple in-process cron that checks for due subscriptions
 * every hour. Safe to call multiple times — only one interval runs.
 *
 * For production with multiple server instances, consider using an
 * external cron service (Railway cron, GitHub Actions, etc.) hitting
 * `GET /api/cron` with the `CRON_SECRET` header instead.
 */
export function startSubscriptionScheduler() {
  if (started) return
  started = true

  const intervalMs = 60 * 60 * 1000 // every hour
  // Run once immediately on startup as well
  run()

  setInterval(run, intervalMs)

  console.log('[scheduler] Subscription processor started (every hour)')
}

async function run() {
  try {
    const { db, hasDatabase } = await import('./db/client')
    if (!hasDatabase || !db) return

    const { processAllSubscriptions } = await import('./trpc/repository')
    const result = await processAllSubscriptions()
    if (result.processed > 0) {
      console.log(
        `[scheduler] Auto-created ${result.processed} subscription transaction(s)`,
      )
    }
  } catch (error) {
    console.error('[scheduler] Failed to process subscriptions:', error)
  }
}
