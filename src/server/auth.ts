import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'

import { db } from './db/client'
import { whitelistedEmails } from './db/schema'

export type AuthUser = {
  id: string
  email: string
  displayName: string | null
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Check if an email is in the whitelist.
 * Returns true when no whitelist table exists (db not set up) so local dev
 * without a database doesn't break. When the table exists, the email must be present.
 */
async function isEmailWhitelisted(email: string): Promise<boolean> {
  if (!db) return true

  const result = await db
    .select({ email: whitelistedEmails.email })
    .from(whitelistedEmails)
    .where(eq(whitelistedEmails.email, email))
    .limit(1)

  return result.length > 0
}

export async function getAuthUser(
  authorizationHeader: string | null,
): Promise<AuthUser | null> {
  if (!authorizationHeader || !supabaseUrl || !supabaseKey) {
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user.email) {
    return null
  }

  const whitelisted = await isEmailWhitelisted(data.user.email)
  if (!whitelisted) {
    return null
  }

  return {
    id: data.user.id,
    email: data.user.email,
    displayName:
      typeof data.user.user_metadata.name === 'string'
        ? data.user.user_metadata.name
        : null,
  }
}
