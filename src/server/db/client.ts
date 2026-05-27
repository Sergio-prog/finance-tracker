import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

export const hasDatabase = Boolean(connectionString)

const client = connectionString
  ? postgres(connectionString, { prepare: false, ssl: 'require' })
  : undefined

export const db = client ? drizzle(client, { schema }) : undefined
