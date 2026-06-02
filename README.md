<div align="center">
  <img src="public/logo.svg" alt="Ledger logo" width="96" height="96" />

  # Ledger

  **A modern, self-hosted personal finance tracker** — track expenses, income,
  and subscriptions with beautiful charts and customizable themes.

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#project-structure">Structure</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Bun-000?style=flat-square&logo=bun&logoColor=fff" alt="Bun" />
    <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TanStack%20Start-FF4154?style=flat-square&logo=reactrouter&logoColor=fff" alt="TanStack Start" />
    <img src="https://img.shields.io/badge/tRPC-2596BE?style=flat-square&logo=trpc&logoColor=fff" alt="tRPC" />
    <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=fff" alt="Supabase" />
    <img src="https://img.shields.io/badge/Drizzle-000?style=flat-square&logo=drizzle&logoColor=C5F74F" alt="Drizzle" />
    <img src="https://img.shields.io/badge/shadcn%2Fui-000?style=flat-square&logo=shadcnui&logoColor=fff" alt="shadcn/ui" />
    <img src="https://img.shields.io/badge/license-MIT-8257E5?style=flat-square" alt="MIT License" />
  </p>
</div>

<br />

> **Why build yet another finance tracker?** I wanted full control over my data,
> a beautiful UI that works on both desktop and mobile, and the ability to
> customize every color and accent. No subscriptions, totally free.

<br />

<p align="center">
  <img src="public/logo.svg" alt="Ledger" width="48" height="48"/>
</p>

> **Screenshot coming soon** — run the project locally to see it in action.
<p align="center">
  <img src="public/app-screenshot.png" alt="screenshot of app" />
</p>

<p align="center">
  <sub>
    <a href="#getting-started">✨ Run Locally</a> •
    <a href="#features">📋 Features</a> •
    <a href="#tech-stack">🛠️ Tech Stack</a>
  </sub>
</p>

---

## Features

<dl>
  <dt>📊 Transaction Tracking</dt>
  <dd>Log expenses and income with categories, labels, notes, and multi-currency support. Edit or delete entries after the fact.</dd>

  <dt>🔄 Subscription Manager</dt>
  <dd>Track recurring bills — monthly and yearly subscriptions with billing cycles, status tracking (active / paused / cancelled), and automatic transaction generation.</dd>

  <dt>📈 Interactive Charts</dt>
  <dd>Visualize spending habits with Recharts-powered charts, gradient fills, and custom tooltips. Group by time buckets (daily, weekly, monthly, yearly).</dd>

  <dt>🎨 Customizable Themes</dt>
  <dd>Choose from 5 accent colors (Amber, Emerald, Sky, Violet, Rose) and 4 background styles (Gradient, Subtle, Warm glow, Cool tones). Light / dark / system mode.</dd>

  <dt>🏷️ Labels & Categories</dt>
  <dd>Organize transactions with custom categories (each with its own icon and color) and freeform labels for cross-cutting tags.</dd>

  <dt>📱 Mobile-First UI</dt>
  <dd>Responsive layout with a bottom navigation bar on mobile and a sidebar on desktop. Designed to work as a PWA — add it to your home screen.</dd>

  <dt>🔐 Self-Hosted & Private</dt>
  <dd>Your data stays in your Supabase instance. Authentication via Google OAuth. No third-party analytics or tracking.</dd>
</dl>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | [Bun](https://bun.sh/) |
| **Framework** | [TanStack Start](https://tanstack.com/start/latest) (React 19 + SSR) |
| **Routing** | [TanStack Router](https://tanstack.com/router/latest) (file-based) |
| **Data Fetching** | [TanStack Query](https://tanstack.com/query/latest) |
| **API Layer** | [tRPC](https://trpc.io/) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Database / Auth** | [Supabase](https://supabase.com/) (PostgreSQL + Google OAuth) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide](https://lucide.dev/) + [Phosphor](https://phosphoricons.com/) |
| **Animation** | [Motion](https://motion.dev/) (formerly Framer Motion) |
| **Typography** | [Manrope Variable](https://fontsource.org/fonts/manrope-variable) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.2+
- A [Supabase](https://supabase.com/) project (free tier works great)
- A Google OAuth app configured in your Supabase dashboard

### Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/Sergio-prog/finance-tracker.git
   cd finance-tracker
   bun install
   ```

2. **Configure environment variables**

   Copy the example env file and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   ```env
   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
   SUPABASE_URL="https://your-project-ref.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
   VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
   ```

3. **Run database migrations**

   ```bash
   bun run db:migrate
   ```

4. **Start the development server**

   ```bash
   bun run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — sign in with Google and start tracking.

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the dev server on port 3000 |
| `bun run build` | Build for production |
| `bun run preview` | Preview the production build |
| `bun run db:generate` | Generate a new Drizzle migration |
| `bun run db:migrate` | Apply pending migrations |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |
| `bun run test` | Run tests with Vitest |
| `bun run seed` | Seed demo transactions (`--email user@… --months 6 --count 80`) |
| `bun run seed:dry` | Dry run — preview without inserting |

## Project Structure

```
src/
├── components/ui/       # shadcn/ui components (button, dialog, tabs, etc.)
├── features/finance/    # Core finance app (dialogs, panels, charts, themes)
├── lib/                 # Utilities (Supabase client, Tailwind helpers)
├── routes/              # File-based TanStack Router routes
├── scripts/            # Utility scripts (seed-transactions.ts)
├── server/
│   ├── db/              # Drizzle schema and database client
│   └── trpc/            # tRPC router, validators, repository
├── router.tsx           # Router configuration
├── routeTree.gen.ts     # Auto-generated route tree
└── styles.css           # Global styles + theme variables
```

## Roadmap

Some ideas for where this could go next:

- [ ] Receipt photo uploads (already in the schema)
- [ ] Recurring transaction templates
- [ ] Budgets and spending limits
- [ ] Multi-currency exchange rate auto-fetch
- [ ] CSV/OFX import and export
- [ ] Shared/family accounts
- [ ] Push notifications for upcoming bills

*This is a hobby project — contributions and ideas are always welcome!*

## License

[MIT](LICENSE) © 2026 Sergio-prog

---

<div align="center">
  <sub>Built with ☕ and curiosity.</sub>
</div>
