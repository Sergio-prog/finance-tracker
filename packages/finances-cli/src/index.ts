#!/usr/bin/env node
import { Command } from 'commander'
import { FinancesClient } from './client'

function getClient(): FinancesClient {
  const apiKey =
    program.getOptionValue('apiKey') ||
    process.env.FINANCES_API_KEY
  if (!apiKey) {
    console.error(
      JSON.stringify({
        error:
          'API key is required. Use --api-key or set FINANCES_API_KEY environment variable.',
      }),
    )
    process.exit(1)
  }

  const baseUrl =
    program.getOptionValue('url') ||
    process.env.FINANCES_URL ||
    'http://localhost:3000'

  return new FinancesClient(baseUrl, apiKey)
}

function output(data: unknown, pretty: boolean) {
  if (pretty) {
    console.dir(data, { depth: null, colors: true })
  } else {
    console.log(JSON.stringify(data))
  }
}

function handleError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  console.error(JSON.stringify({ error: message }))
  process.exit(1)
}

function run(fn: (...args: unknown[]) => Promise<void>) {
  return (...args: unknown[]) => {
    fn(...args).catch(handleError)
  }
}

const program = new Command()
  .name('finances-cli')
  .description('CLI for the Finance Tracker API')
  .option('-k, --api-key <key>', 'API key (or FINANCES_API_KEY env)')
  .option('-u, --url <url>', 'Base URL (or FINANCES_URL env)')
  .option('-p, --pretty', 'Pretty-print output')
  .showHelpAfterError(true)

// ── account ──────────────────────────────────────────────
program
  .command('account')
  .description('Get account info')
  .action(
    run(async () => {
      const client = getClient()
      const data = await client.get('/api/v1/account')
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

// ── dashboard ────────────────────────────────────────────
program
  .command('dashboard')
  .description('Get full dashboard dump')
  .action(
    run(async () => {
      const client = getClient()
      const data = await client.get('/api/v1/dashboard')
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

// ── transactions ─────────────────────────────────────────
const transactions = program
  .command('transactions')
  .description('Manage transactions')

transactions
  .command('list')
  .description('List all transactions')
  .action(
    run(async () => {
      const client = getClient()
      const data = await client.get('/api/v1/transactions')
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

transactions
  .command('get <id>')
  .description('Get a transaction by ID')
  .action(
    run(async (id: string) => {
      const client = getClient()
      const data = await client.get(`/api/v1/transactions/${id}`)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

transactions
  .command('create')
  .description('Create a transaction')
  .requiredOption('-t, --type <type>', "expense or income")
  .requiredOption('-c, --category-id <id>', 'Category UUID')
  .requiredOption('-a, --amount <amount>', 'Amount in main currency (e.g. 12.50)')
  .requiredOption('-C, --currency <code>', '3-letter currency code (USD, EUR)')
  .requiredOption('-d, --date <date>', 'Operation date (YYYY-MM-DD)')
  .option('-n, --note <text>', 'Optional note')
  .option('-l, --labels <labels>', 'Comma-separated labels')
  .action(
    run(async (opts: Record<string, string>) => {
      const client = getClient()
      const body: Record<string, unknown> = {
        type: opts.type,
        categoryId: opts.categoryId,
        amount: Number(opts.amount),
        currency: opts.currency.toUpperCase(),
        operationDate: opts.date,
      }
      if (opts.note) body.note = opts.note
      if (opts.labels)
        body.labels = opts.labels.split(',').map((s: string) => s.trim())
      const data = await client.post('/api/v1/transactions', body)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

transactions
  .command('delete <id>')
  .description('Delete a transaction')
  .action(
    run(async (id: string) => {
      const client = getClient()
      const data = await client.delete(`/api/v1/transactions/${id}`)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

// ── categories ───────────────────────────────────────────
const categories = program
  .command('categories')
  .description('Manage categories')

categories
  .command('list')
  .description('List all categories')
  .action(
    run(async () => {
      const client = getClient()
      const data = await client.get('/api/v1/categories')
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

categories
  .command('get <id>')
  .description('Get a category by ID')
  .action(
    run(async (id: string) => {
      const client = getClient()
      const data = await client.get(`/api/v1/categories/${id}`)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

categories
  .command('create')
  .description('Create a category')
  .requiredOption('-n, --name <name>', 'Category name')
  .requiredOption('-i, --icon <icon>', 'Emoji icon (e.g. 🍜)')
  .requiredOption('-t, --type <type>', "expense or income")
  .option('-c, --color <color>', 'Hex color (e.g. #ff6600)')
  .action(
    run(async (opts: Record<string, string>) => {
      const client = getClient()
      const body: Record<string, string> = {
        name: opts.name,
        icon: opts.icon,
        type: opts.type,
      }
      if (opts.color) body.color = opts.color
      const data = await client.post('/api/v1/categories', body)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

// ── subscriptions ────────────────────────────────────────
const subscriptions = program
  .command('subscriptions')
  .description('Manage subscriptions')

subscriptions
  .command('list')
  .description('List all subscriptions')
  .action(
    run(async () => {
      const client = getClient()
      const data = await client.get('/api/v1/subscriptions')
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

subscriptions
  .command('get <id>')
  .description('Get a subscription by ID')
  .action(
    run(async (id: string) => {
      const client = getClient()
      const data = await client.get(`/api/v1/subscriptions/${id}`)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

subscriptions
  .command('create')
  .description('Create a subscription')
  .requiredOption('-n, --name <name>', 'Subscription name')
  .requiredOption('-a, --amount <amount>', 'Amount in main currency')
  .requiredOption('-C, --currency <code>', '3-letter currency code')
  .requiredOption('-d, --next-charge-date <date>', 'Next charge date (YYYY-MM-DD)')
  .option('-f, --frequency <freq>', "monthly or yearly (default: monthly)")
  .option('-c, --category-id <id>', 'Category UUID')
  .option('-b, --billing-day <day>', 'Billing day (1-31)')
  .option('-o, --notes <text>', 'Optional notes')
  .option('--no-auto', 'Disable auto-creating transactions')
  .action(
    run(async (opts: Record<string, string>) => {
      const client = getClient()
      const body: Record<string, unknown> = {
        name: opts.name,
        amount: Number(opts.amount),
        currency: opts.currency.toUpperCase(),
        nextChargeDate: opts.nextChargeDate,
      }
      if (opts.frequency) body.billingFrequency = opts.frequency
      if (opts.categoryId) body.categoryId = opts.categoryId
      if (opts.billingDay) body.billingDay = Number(opts.billingDay)
      if (opts.notes) body.notes = opts.notes
      if (opts.auto !== undefined)
        body.autoCreateTransactions = opts.auto !== 'false'
      const data = await client.post('/api/v1/subscriptions', body)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

subscriptions
  .command('delete <id>')
  .description('Delete a subscription')
  .action(
    run(async (id: string) => {
      const client = getClient()
      const data = await client.delete(`/api/v1/subscriptions/${id}`)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

// ── labels ───────────────────────────────────────────────
const labels = program
  .command('labels')
  .description('Manage labels')

labels
  .command('list')
  .description('List all labels')
  .action(
    run(async () => {
      const client = getClient()
      const data = await client.get('/api/v1/labels')
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

labels
  .command('get <id>')
  .description('Get a label by ID')
  .action(
    run(async (id: string) => {
      const client = getClient()
      const data = await client.get(`/api/v1/labels/${id}`)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

labels
  .command('create')
  .description('Create a label')
  .requiredOption('-n, --name <name>', 'Label name')
  .action(
    run(async (opts: Record<string, string>) => {
      const client = getClient()
      const data = await client.post('/api/v1/labels', { name: opts.name })
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

labels
  .command('delete <id>')
  .description('Delete a label')
  .action(
    run(async (id: string) => {
      const client = getClient()
      const data = await client.delete(`/api/v1/labels/${id}`)
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

// ── aggregated ───────────────────────────────────────────
program
  .command('aggregated')
  .description('Get aggregated data by period')
  .requiredOption('-p, --period <period>', "year, month, or week")
  .option('-d, --date <date>', 'Anchor date (YYYY-MM-DD, defaults to today)')
  .action(
    run(async (opts: Record<string, string>) => {
      const client = getClient()
      const params = new URLSearchParams({ period: opts.period })
      if (opts.date) params.set('date', opts.date)
      const data = await client.get(
        `/api/v1/aggregated?${params.toString()}`,
      )
      output(data, program.getOptionValue('pretty') as boolean)
    }),
  )

// ── run ──────────────────────────────────────────────────
program.parse(process.argv)
