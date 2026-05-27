import { createClient } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  email: string
  displayName: string | null
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY

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

  return {
    id: data.user.id,
    email: data.user.email,
    displayName:
      typeof data.user.user_metadata.name === 'string'
        ? data.user.user_metadata.name
        : null,
  }
}
