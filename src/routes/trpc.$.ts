import { createFileRoute } from '@tanstack/react-router'

async function handleTrpcRequest(request: Request) {
  const [{ fetchRequestHandler }, { appRouter, createContext }] =
    await Promise.all([
      import('@trpc/server/adapters/fetch'),
      import('@/server/trpc/router'),
    ])

  return fetchRequestHandler({
    endpoint: '/trpc',
    req: request,
    router: appRouter,
    createContext,
  })
}

export const Route = createFileRoute('/trpc/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleTrpcRequest(request),
      POST: ({ request }) => handleTrpcRequest(request),
    },
  },
})
