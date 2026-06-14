#!/usr/bin/env bun
/**
 * Seed transactions for a specific user.
 *
 * Usage:
 *   bun run scripts/seed-transactions.ts --email user@example.com
 *   bun run scripts/seed-transactions.ts --userId <uuid> --months 3 --count 30
 *
 * Options:
 *   --email     User email (looks up the user in profiles)
 *   --userId    Direct user UUID (skips email lookup)
 *   --months    How many months back to spread transactions (default: 6)
 *   --count     Approximate number of transactions to create (default: 60)
 *   --dry-run   Preview without inserting
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../src/server/db/schema'

// ─── Parse args ───────────────────────────────────────────────────────────

const args: Record<string, string> = {}
const flags = new Set<string>()
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (!arg.startsWith('--')) continue
  const trimmed = arg.slice(2)
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx !== -1) {
    args[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  } else {
    // Check if next arg looks like a value (doesn't start with --)
    const next = process.argv[i + 1]
    if (next && !next.startsWith('--')) {
      args[trimmed] = next
      i++
    } else {
      flags.add(trimmed)
    }
  }
}

const email = args['email']
const userId = args['userId']
const monthsBack = Math.max(1, parseInt(args['months'] ?? '6', 10))
const targetCount = Math.max(1, parseInt(args['count'] ?? '60', 10))
const dryRun = flags.has('dry-run')

if (!email && !userId) {
  console.error('Provide either --email <email> or --userId <uuid>')
  process.exit(1)
}

// ─── DB connection ─────────────────────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set — add it to .env')
  process.exit(1)
}

const client = postgres(databaseUrl, { prepare: false, ssl: 'require' })
const db = drizzle(client, { schema })

// ─── Helpers ───────────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Realistic expense descriptors per category
const expenseNotes: Record<string, string[]> = {
  Food: ['Lunch at trattoria', 'Dinner out', 'Pizza night', 'Sushi takeaway', 'Burger joint', 'Thai street food'],
  Groceries: ['Weekly shop - Lidl', 'Weekly shop - Carrefour', 'Farmers market', 'Organic produce', 'Supermarket run'],
  Coffee: ['Morning flat white', 'Cappuccino & pastry', 'Iced latte', 'Cold brew', 'Espresso shot'],
  Home: ['Ikea haul', 'Cleaning supplies', 'Light bulbs & bits', 'New towels', 'Cushion covers'],
  Bills: ['Electricity bill', 'Water bill', 'Internet - Starlink', 'Gas bill', 'Council tax'],
  Transport: ['Metro top-up', 'Bus pass', 'Taxi to airport', 'Train ticket', 'Uber ride'],
  Car: ['Shell petrol', 'Tyre pressure check', 'Car wash', 'Engine oil', 'Parking ticket'],
  Health: ['Pharmacy - vitamins', 'Dentist checkup', 'Gym membership', 'Therapy session', 'Eye test'],
  Travel: ['Flight to Berlin', 'Airbnb Barcelona', 'Hostel booking', 'Travel insurance', 'Ferry ticket'],
  Shopping: ['Zara hoodie', 'New sneakers', 'Muji pens & notebook', 'Uniqlo basics', 'Thrift store finds'],
  Gifts: ["Birthday gift - Mum", 'Housewarming plant', 'Xmas present - sibling', "Friend's wedding gift", 'Thank-you flowers'],
  Pets: ['Dog food bag', 'Cat litter', 'Vet checkup', 'New leash', 'Pet toys'],
  Education: ['Udemy course', 'Domain + hosting', 'Book - Clean Code', 'Conference ticket', 'Coursera sub'],
  'AI tools': ['ChatGPT Plus', 'Claude Pro', 'Midjourney sub', 'Copilot sub', 'Perplexity Pro'],
  Hosting: ['DigitalOcean droplet', 'Vercel pro', 'Supabase pro', 'Cloudflare R2', 'Namecheap domain'],
  Streaming: ['Netflix', 'Spotify', 'YouTube Premium', 'Crunchyroll', 'Disney+'],
  Productivity: ['Notion Plus', 'Todoist Premium', 'Obsidian Sync', 'Grammarly Premium', '1Password'],
  Entertainment: ['Cinema ticket', 'Concert - indie band', 'Board game cafe', 'Arcade night', 'Museum entry'],
  Cloud: ['iCloud storage', 'Google One', 'Dropbox Plus', 'AWS test instance', 'Backblaze B2'],
  Fitness: ['Protein powder', 'New yoga mat', 'Swimming pass', 'Climbing session', 'Massage gun'],
  Dining: ['Ramen joint', 'Steakhouse dinner', 'Tapas night', 'Brunch cafe', 'Rooftop bar drinks'],
  Insurance: ['Health insurance', 'Rental insurance', 'Travel insurance', 'Phone insurance', 'Pet insurance'],
}

const incomeNotes: Record<string, string[]> = {
  Salary: ['Monthly salary', 'Bonus payment'],
  'Side profit': ['eBay sale', 'Fiverr gig', 'Refund', 'Cashback reward'],
  Freelance: ['Freelance web dev', 'Design project', 'Consulting call'],
  Investment: ['Dividend payout', 'Stock sale profit', 'Crypto gain'],
  Gift: ['Birthday money', 'Holiday gift', 'Wedding gift'],
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Looking up user…')

  let resolvedUserId: string

  if (userId) {
    resolvedUserId = userId
    // Verify user exists
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, resolvedUserId))
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!profile) {
      console.error(`No profile found for userId: ${resolvedUserId}`)
      await client.end()
      process.exit(1)
    }
    console.log(`✅ Found user: ${profile.email} (${profile.id})`)
  } else {
    // Lookup by email — insert profile if missing
    const [existing] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.email, email))
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (existing) {
      resolvedUserId = existing.id
      console.log(`✅ Found existing user: ${existing.email} (${existing.id})`)
    } else {
      // Create a placeholder profile (real sign-in will update it)
      const [created] = await db
        .insert(schema.profiles)
        .values({
          id: crypto.randomUUID(),
          email: email,
          displayName: email.split('@')[0],
        })
        .returning()

      resolvedUserId = created.id
      console.log(`🆕 Created placeholder profile: ${created.email} (${created.id})`)
    }
  }

  // ── Fetch existing categories ──────────────────────────────────────────

  const allCategories = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, resolvedUserId))

  const expenseCategories = allCategories.filter((c) => c.type === 'expense')
  const incomeCategories = allCategories.filter((c) => c.type === 'income')

  if (expenseCategories.length === 0) {
    console.warn('⚠️  No expense categories found — seed categories first by logging in once.')
  }
  if (incomeCategories.length === 0) {
    console.warn('⚠️  No income categories found.')
  }

  console.log(
    `📦 Found ${expenseCategories.length} expense + ${incomeCategories.length} income categories`,
  )

  // ── Generate transactions ──────────────────────────────────────────────

  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(startDate.getMonth() - monthsBack)

  // Transaction types distribution: ~80% expense, ~20% income
  const typePool: ('expense' | 'income')[] = [
    ...Array(80).fill('expense'),
    ...Array(20).fill('income'),
  ]

  const transactions: Array<{
    userId: string
    categoryId: string | null
    type: 'expense' | 'income'
    amountMinor: number
    currency: string
    operationDate: string
    note: string | null
    labels: string[]
  }> = []

  const labelPool = ['Must haves', 'Work', 'Family', 'Yearly', 'One-time', 'Home office', 'Subs']

  for (let i = 0; i < targetCount; i++) {
    const type = pick(typePool)
    const isExpense = type === 'expense'
    const cats = isExpense ? expenseCategories : incomeCategories

    if (cats.length === 0) continue

    const category = pick(cats)
    const catName = category.name

    // Random date within range
    const date = addDays(startDate, randomInt(0, Math.floor((today.getTime() - startDate.getTime()) / 86400000)))
    const dateStr = formatDate(date)

    // Realistic amount
    let amount: number
    if (isExpense) {
      // Expenses: some small daily, some medium, rare large
      const roll = Math.random()
      if (roll < 0.4) amount = randomFloat(2.5, 25)       // coffee, snacks, metro
      else if (roll < 0.75) amount = randomFloat(20, 120)  // groceries, dining, top-up
      else if (roll < 0.92) amount = randomFloat(100, 400) // shopping, bills, health
      else amount = randomFloat(400, 2000)                  // travel, big purchases
    } else {
      // Income: semi-regular amounts
      const roll = Math.random()
      if (roll < 0.5) amount = randomFloat(100, 500)       // side gigs, gifts
      else if (roll < 0.8) amount = randomFloat(1500, 4000) // freelance, part-time
      else amount = randomFloat(4000, 12000)                // salary, big payouts
    }

    // Note
    const notes = isExpense ? expenseNotes[catName] : incomeNotes[catName]
    const note = pick(notes)

    // Labels (about 30% of transactions have them)
    const labels = Math.random() < 0.3 ? [pick(labelPool)] : []

    transactions.push({
      userId: resolvedUserId,
      categoryId: category.id,
      type,
      amountMinor: Math.round(amount * 100),
      currency: 'USD',
      operationDate: dateStr,
      note,
      labels,
    })
  }

  if (transactions.length === 0) {
    console.log('❌ No transactions to seed.')
    await client.end()
    process.exit(0)
  }

  // Sort chronologically
  transactions.sort(
    (a, b) => a.operationDate.localeCompare(b.operationDate),
  )

  console.log(`\n📋 Generated ${transactions.length} transactions (${monthsBack} months, ${targetCount} target)`)

  // Stats
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amountMinor, 0)
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amountMinor, 0)

  console.log(`   💸 Expenses:  $${(totalExpenses / 100).toLocaleString()}`)
  console.log(`   💰 Income:    $${(totalIncome / 100).toLocaleString()}`)
  console.log(`   📅 Range:     ${transactions[0].operationDate} → ${transactions[transactions.length - 1].operationDate}`)

  // Preview a few
  console.log('\n📄 Sample transactions:')
  for (const tx of transactions.slice(0, 5)) {
    const isExp = tx.type === 'expense'
    console.log(
      `   ${isExp ? '🔴' : '🟢'} ${tx.operationDate}  $${(tx.amountMinor / 100).toFixed(2)}  ${tx.type.padEnd(7)} ${tx.note}`,
    )
  }
  if (transactions.length > 5) {
    console.log(`   … and ${transactions.length - 5} more`)
  }

  // ── Insert ─────────────────────────────────────────────────────────────

  if (dryRun) {
    console.log('\n🏁 Dry run — no data inserted.')
  } else {
    console.log('\n⏳ Inserting transactions…')

    // Insert in batches of 20 to stay within PG limits
    const batchSize = 20
    let inserted = 0
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)
      await db.insert(schema.transactions).values(batch)
      inserted += batch.length
      process.stdout.write(`   ${inserted}/${transactions.length}\r`)
    }

    console.log(`\n✅ Inserted ${inserted} transactions successfully!`)
  }

  await client.end()
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
