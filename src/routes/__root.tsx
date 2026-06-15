import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Ledger | Finance Tracker',
      },
      {
        name: 'theme-color',
        content: '#9f5f2c',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/logo.svg',
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
        sizes: '32x32',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <div className="grid max-w-md gap-4 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive mx-auto">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </a>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <div className="grid max-w-md gap-4 text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="text-sm text-muted-foreground">This page does not exist.</p>
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </a>
      </div>
    </div>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
