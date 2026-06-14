# Plan 001: Add PWA install prompt + offline service worker

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat d3d7ba8..HEAD -- vite.config.ts src/features/finance/FinanceApp.tsx src/routes/__root.tsx package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `d3d7ba8`, 2026-06-15

## Why this matters

The project already has `public/manifest.json` with `display: standalone` and icons, plus the `__root.tsx` meta tags. But there is no service worker registration and no install prompt in the UI. The `AGENTS.md` explicitly states the project is "intended to work on both mobile and pc. on mobile it is could be add as app with 'add to homepage' button." This plan makes the PWA actually installable and adds a basic offline cache so the app loads even without a connection.

## Current state

- `vite.config.ts` — Vite config with three plugins: tailwindcss, tanstackStart, viteReact. No PWA plugin.
- `public/manifest.json` — complete PWA manifest with `display: standalone`, icons, names, theme_color.
- `src/routes/__root.tsx` — root route with `<HeadContent>` and `<Scripts>`, already has `apple-touch-icon` and `theme-color` meta but no manifest `<link>`.
- `src/features/finance/FinanceApp.tsx` — main app shell with a `<header>` containing a notification bell button (line 147-152). No install prompt component.

Key excerpts:

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})

export default config
```

`src/routes/__root.tsx` (head section, lines 6-39):
```tsx
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Ledger | Finance Tracker' },
      { name: 'theme-color', content: '#9f5f2c' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  // ...
})
```

`src/features/finance/FinanceApp.tsx` (header, lines 137-155):
```tsx
<header className="flex items-center justify-between gap-3 border-b pb-4">
  <div className="flex items-center gap-3">
    <img src="/logo.svg" alt="Ledger" className="size-10 shrink-0" />
    <div>
      <h1 className="text-xl font-semibold tracking-normal">Ledger</h1>
      <p className="text-sm text-muted-foreground">
        Expenses, income, and recurring services
      </p>
    </div>
  </div>
  <div className="hidden items-center gap-2 md:flex">
    <Button variant="outline" size="icon" aria-label="Notifications">
      <Bell />
    </Button>
  </div>
</header>
```

Repo conventions:
- `bun` as package manager and runtime
- `@/` import alias (maps to `./src/*`)
- Component files use explicit named exports, not default exports
- Styling: Tailwind CSS v4 with `cn()` from `@/lib/utils`
- Icons from `lucide-react`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `bun install`            | exit 0              |
| Typecheck | `bun x tsc --noEmit`     | exit 0, no errors   |
| Lint      | `bun run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `vite.config.ts` — add `vite-plugin-pwa`
- `package.json` — add `vite-plugin-pwa` devDependency
- `src/routes/__root.tsx` — add manifest link to head, add service worker script
- `src/features/finance/FinanceApp.tsx` — add install prompt component in header
- `src/features/finance/InstallPrompt.tsx` — new file, install prompt component

**Out of scope** (do NOT touch):
- `public/manifest.json` — already correct, do not modify
- Any push notification integration — that's plan 003
- Full offline data sync (IndexedDB, etc.)
- Any change to the SSR/tRPC pipeline
- `src/server/` — no server-side changes

## Git workflow

- Branch: `advisor/001-pwa-install`
- Commit style: conventional commits (e.g. `feat: add PWA install prompt with vite-plugin-pwa`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install vite-plugin-pwa

Add `vite-plugin-pwa` as a devDependency:

```bash
bun add -D vite-plugin-pwa
```

**Verify**: `grep "vite-plugin-pwa" package.json` returns a match with the version.

### Step 2: Configure vite-plugin-pwa in vite.config.ts

Add the PWA plugin to `vite.config.ts`. Configure it to use the existing `public/manifest.json` as the manifest source. Generate a basic service worker that caches the shell (HTML, CSS, JS, images) for offline access.

The plugin should be added **after** the existing plugins. The configuration should:
- Set `registerType: 'autoUpdate'` so the SW updates automatically
- Point `manifest` to `false` (we already have `public/manifest.json` serving statically)
- Include the existing `public/` icons in the precache
- Include runtime caching for API calls (`/trpc`, `/api/v1/*`) so already-loaded data is available offline

```ts
import { VitePWA } from 'vite-plugin-pwa'

// Inside plugins array, add after existing plugins:
VitePWA({
  registerType: 'autoUpdate',
  manifest: false, // public/manifest.json is used instead
  workbox: {
    globPatterns: ['**/*.{html,js,css,svg,png,jpg,ico,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^\/(trpc|api)/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
        },
      },
    ],
  },
})
```

**Verify**: `bun x tsc --noEmit` exits 0 (may show warnings about PWA types, that's acceptable). `bun run build` should complete successfully and produce a `sw.js` in the dist output (check `dist/client/sw.js` exists after build).

### Step 3: Add manifest link to __root.tsx head

Add the manifest `<link>` to the `head()` function's `links` array in `src/routes/__root.tsx`:

```tsx
{ rel: 'manifest', href: '/manifest.json' },
```

Add it after the existing `apple-touch-icon` link.

**Verify**: Load the app in a browser with DevTools open → Application tab → Manifest section. The manifest should be detected with the correct name, icons, and theme color.

### Step 4: Create InstallPrompt component

Create `src/features/finance/InstallPrompt.tsx`:

This component should:
1. Listen for the `beforeinstallprompt` event (stored in a ref)
2. Detect if the app is already running in standalone mode (`window.matchMedia('(display-mode: standalone)').matches`)
3. Show a small button/banner near the header only when installable and not already installed
4. On click, call `deferredPrompt.prompt()` and hide the button

Use the existing convention from `FinanceApp.tsx`:
- Import icons from `lucide-react` (use `Download` or `MonitorDown`)
- Import `useState, useEffect, useRef` from React
- Use `Button` from `@/components/ui/button`
- Style with Tailwind classes
- Hook type for the `beforeinstallprompt` event (TypeScript doesn't ship with it):

```ts
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}
```

Exported function: `export function InstallPrompt()`

**Verify**: `bun run lint` exits 0 on the new file.

### Step 5: Render InstallPrompt in the FinanceApp header

Import and render `<InstallPrompt />` in `src/features/finance/FinanceApp.tsx` header div, alongside the notifications `<Button>`:

```tsx
import { InstallPrompt } from './InstallPrompt'

// In the header's right-side div (line 148 area):
<div className="hidden items-center gap-2 md:flex">
  <InstallPrompt />
  <Button variant="outline" size="icon" aria-label="Notifications">
    <Bell />
  </Button>
</div>
```

**Verify**: `bun x tsc --noEmit` exits 0.

### Step 6: Build and verify PWA

```bash
bun run build
```

Check that `dist/client/sw.js` and `dist/client/workbox-*.js` exist.

**Verify**: Run `bun run preview` (or `bun run dev`) and open the app in a Chromium-based browser. The address bar should show the install icon (or check DevTools → Application → Manifest). On mobile, an "Add to Home Screen" banner should appear after visiting the app a couple times.

## Test plan

This plan has no testable backend logic — it's a PWA configuration + UI shell. Manual verification:

- [ ] `public/manifest.json` is detected by the browser (DevTools → Application → Manifest)
- [ ] `beforeinstallprompt` fires in Chrome/Edge
- [ ] InstallPrompt component renders a button when the event fires
- [ ] Clicking the button triggers the native install dialog
- [ ] After install, the button hides
- [ ] Running in standalone mode, the button does not appear
- [ ] `dist/client/sw.js` is generated after build

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run build` exits 0
- [ ] `dist/client/sw.js` exists
- [ ] `grep -rn "vite-plugin-pwa" package.json` returns a match
- [ ] `grep -rn "manifest" src/routes/__root.tsx` returns a match for `'manifest'`
- [ ] `src/features/finance/InstallPrompt.tsx` exists with the exported function
- [ ] `bun x tsc --noEmit` exits 0 (warnings permitted if from third-party types)
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- `vite-plugin-pwa` conflicts with `tanstackStart` plugin at build time (check the build output for errors about module resolution or SSR)
- The build succeeds but no `sw.js` is emitted
- The existing lint errors unrelated to this plan (from the project baseline) obscure new lint errors — run `bun run lint` only on the changed files: `bun x eslint src/features/finance/InstallPrompt.tsx`
- Adding the PWA plugin increases the production bundle by more than ~300KB (unlikely but check)

## Maintenance notes

- The `workbox.runtimeCaching` pattern caches `/trpc` and `/api` responses. If new API routes are added under different path prefixes, update the `urlPattern`.
- `registerType: 'autoUpdate'` means the SW updates itself; add a custom update prompt component if you want user control over updates.
- The `vite-plugin-pwa` docs recommend a periodic SW version check; this plan uses autoUpdate which is sufficient for a personal app.
