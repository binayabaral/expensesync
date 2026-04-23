# XpenseSync

**Your finances, finally in control.**

A full-featured personal finance tracker built for real life — track expenses, split bills, manage credit cards and loans, monitor assets, and get AI-powered financial advice. Optimised for Nepal (NPR, gold in tola, stocks on NEPSE) while supporting 22+ currencies.

**Live at → [xpensesync.com](https://xpensesync.com)**

---

## Features

### Accounts & Transactions
- Multiple account types: Cash, Bank, Credit Card, Loan, and Bill Split virtual accounts
- Manual transaction entry with categories, payees, notes, and date
- Inline row editing on desktop (click to edit in place); sheet-based editing on mobile
- Bulk create and bulk delete
- Payee → category auto-fill; keyboard shortcuts (⌘⇧A to add, ⌘↵ to save, Esc to cancel)

### Transfers
- Self-transfers between your own accounts
- Peer transfers to other enrolled users
- Foreign currency support — enter `toAmount` for cross-currency transfers
- Transfer charge tracking
- Linked to credit card statements

### Credit Cards
- Statement cycle tracking with configurable close day and payment due day
- APR + interest estimation
- Manual statement closing (accommodates Nepali bank billing quirks)
- Payment recording as linked transfers; tracks paid amount and settlement status
- Dashboard widget: current owed, utilisation, available credit, APR, next due, minimum payment

### Loans
- EMI loans (amortised, with tenure and APR) and informal peer loans
- Payment history and remaining balance
- Optional linked recurring payment for EMI auto-reminders

### Recurring Payments
- Daily, monthly (by day of month), yearly (by month + day), and every N months
- Transaction or transfer type
- Manual execution — tap "Complete" to pre-fill a form with the due amount and date
- Push notification reminders (day-of and day-before) via cron

### Assets
- Gold 22K, Gold 24K, Silver, and NEPSE stocks
- Lot-level tracking with FIFO buy/sell records
- Sell splits into principal return + profit transactions automatically
- Live prices scraped from public sources; GitHub Actions cron runs Sun–Fri at 11AM and 4PM NPT
- Asset dashboard: bought price/unit, current live price/unit, market value, unrealised P&L

### Financial Health (Net Worth)
- Monthly net worth snapshots computed on the fly
- Area chart with D3 symlog scale (handles negative net worth gracefully)
- Summary cards: Assets, Liabilities, Net Worth
- Assets valued at cost basis (not market price) — intentional for balance sheet accuracy

### Bill Splitting
- Groups (with currency) and standalone expenses
- Four split types: Equal (with round-robin remainder), Exact, Percentage, and Shares
- Contacts can be standalone or linked to another enrolled user
- Net balance computation — batched queries, no N+1
- Optimal settlement algorithm minimises the number of transactions needed

### Analytics
- Spending by category and by payee
- 6-month, 12-month, and all-time trend views
- Pie, radial, and radar chart variants
- Account and date range filters

### AI Features *(Pro)*
- **AI Advisor** — weekly financial health analysis with personalised advice; powered by Gemini, cached in DB, rate-limited per user
- **AI Organizer** — bulk-categorise and tag transactions using AI

### PWA
- Installable on iOS and Android via Add to Home Screen
- Offline fallback page with service worker caching
- Web push notifications for recurring payment reminders

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth | Clerk |
| API | Hono (edge-compatible, chained routes) |
| ORM | Drizzle ORM |
| Database | PostgreSQL via Neon (serverless) |
| UI | shadcn/ui + Radix UI + Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| State | Zustand (sheet open/close state) |
| Push notifications | Web Push (VAPID) |
| AI | Google Gemini (Vertex AI + Dev API) |
| Package manager | pnpm |
| Deployment | Vercel |
| Cron | GitHub Actions + Vercel Cron |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application

### Installation

```bash
git clone https://github.com/binayabaral/xpensesync.git
cd xpensesync
pnpm install
```

### Environment Variables

Copy `.env` to `.env.local` and fill in the values:

```bash
# Database
DATABASE_URL=                          # Neon pooled connection string

# App
NEXT_PUBLIC_APP_URL=                   # e.g. http://localhost:3000

# Clerk
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# AI (optional — needed for AI Advisor / AI Organizer)
GOOGLE_GENERATIVE_AI_API_KEY=          # Gemini Dev API key
VERTEX_AI_API_KEY=                     # Vertex AI key (paid tier)

# Web Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_MAILTO=

# Cron job auth
CRON_SECRET=                           # Any random secret string
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### Database Setup

```bash
pnpm drizzle-kit generate   # generate migrations from schema
pnpm drizzle-kit migrate    # apply migrations to the database
```

### Run Locally

```bash
pnpm dev
```

---

## Project Structure

```
app/
  api/[[...route]]/       # Hono API routes (one file per feature)
  dashboard/              # Protected app pages
  (auth)/                 # Sign-in / sign-up layout
  page.tsx                # Public landing page
db/
  schema.ts               # Drizzle schema (single source of truth)
  drizzle.ts              # DB client
  migrations/             # Auto-generated migration files
features/
  <feature>/
    api/                  # TanStack Query hooks (useGet*, useCreate*, etc.)
    components/           # Feature-specific React components
    hooks/                # Zustand sheet state (useOpen*.ts)
components/               # Shared UI components
lib/                      # Shared utilities (push, recurring-utils, utils)
scripts/                  # Asset price scrapers (gold, NEPSE stocks)
```

---

## Cron Jobs

| Job | Schedule | Purpose |
|---|---|---|
| `/api/cron/recurring-reminders` | Daily 01:00 UTC | Push notifications for recurring payments due today or tomorrow |
| Asset price scraper | Sun–Fri 05:15 UTC + 10:15 UTC | Scrape live gold and NEPSE stock prices via GitHub Actions |

---

## Conventions

- **Amounts**: stored as mili-units (`NPR 199` → `199000`). Use `formatCurrency()` for display.
- **IDs**: `createId()` from `@paralleldrive/cuid2`
- **API auth**: `getAuth(c)` from `@hono/clerk-auth`; all routes behind Clerk middleware
- **Dates**: `z.coerce.date()` + `startOfMinute(new Date())` default in Zod schemas

---

Built by [Binaya Baral](https://github.com/binayabaral)
