import { createTRPCClient, httpBatchLink } from '@trpc/client'

import { supabase } from '@/lib/supabase'
import type { AppRouter } from '@/server/trpc/router'

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
      async headers() {
        const { data } = supabase
          ? await supabase.auth.getSession()
          : { data: { session: null } }

        return data.session?.access_token
          ? {
              authorization: `Bearer ${data.session.access_token}`,
            }
          : {}
      },
    }),
  ],
})
