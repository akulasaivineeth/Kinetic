# ⚡ Kinetic — Performance Arena

A premium dark-themed fitness PWA built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase**. Track push-ups, planks, and runs — then compete with friends in the Arena.

![Kinetic](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?logo=supabase) ![PWA](https://img.shields.io/badge/PWA-Ready-emerald)

## Features

- **Google Sign-In** with invite-only access (admin generates one-time links)
- **Whoop Integration** via webhooks → instant push notifications → pre-filled Log screen
- **Dashboard** — PULSE MODE with metric cards, sparklines, Personal Trends chart, Stamina Score + Peak Gain rings
- **Log Screen** — Big number inputs for push-ups/planks/runs, weekly volume progress bar, photo upload, auto-save drafts, offline sync
- **Arena** — Live leaderboard with podium, Intensity Velocity chart, Detailed Standings, Volume/Peak + Raw/% Imp toggles
- **Profile** — Avatar with emerald ring, Google account status, Dark/Light toggle, Performance Goals editor, Apple Fitness-style sharing
- **Glassmorphism UI** — Dark theme with emerald (#10B981) accents, 200ms spring micro-animations, SF Pro typography
- **PWA** — Installable, offline-capable, push notifications, background sync

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Glassmorphism |
| Animation | Framer Motion |
| Backend | Supabase (Auth, Postgres, RLS, Realtime, Storage, Edge Functions) |
| Charts | Recharts |
| State | TanStack Query |
| Validation | Zod |
| Offline | Service Worker + idb-keyval |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account ([supabase.com](https://supabase.com))
- Google Cloud Console project (for OAuth)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/kinetic.git
cd kinetic
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Run the migration:
   ```bash
   npx supabase db push
   ```
   Or manually execute `supabase/migrations/001_initial_schema.sql` in the SQL Editor.

3. Enable **Google OAuth** in Supabase → Authentication → Providers → Google
4. Set your redirect URL to `http://localhost:3000/auth/callback`

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Generate with `npx web-push generate-vapid-keys`
- `VAPID_PRIVATE_KEY` — From the same command above

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the first user to sign in becomes the **admin** and can generate invite links from Profile.

### 5. Deploy

**Vercel:**
```bash
npx vercel
```

**Supabase Edge Functions:**
```bash
npx supabase functions deploy whoop-webhook
```

## Project Structure

```
kinetic/
├── public/
│   ├── icons/          # PWA icons
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service worker
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing / Sign-in
│   │   ├── auth/callback/        # OAuth callback
│   │   ├── dashboard/page.tsx    # Dashboard (PULSE MODE)
│   │   ├── log/page.tsx          # Workout logging
│   │   ├── arena/page.tsx        # Leaderboard + Arena
│   │   ├── profile/page.tsx      # Profile & settings
│   │   └── api/
│   │       ├── whoop/webhook/    # Whoop webhook handler
│   │       └── push/subscribe/   # Push subscription
│   ├── components/
│   │   ├── layout/               # AppShell, BottomNav, Header
│   │   ├── ui/                   # GlassCard, ScoreRing, Toggles, etc.
│   │   └── charts/               # Chart components
│   ├── hooks/                    # TanStack Query hooks
│   ├── lib/                      # Supabase clients, utils, validation
│   ├── providers/                # Auth, Query, Theme providers
│   ├── styles/                   # Global CSS + Tailwind
│   └── types/                    # TypeScript types + Supabase schema
├── supabase/
│   ├── migrations/               # SQL schema + RLS policies
│   ├── functions/                # Edge Functions
│   └── config.toml               # Supabase config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## Whoop Integration

1. Register your app at [developer.whoop.com](https://developer.whoop.com)
2. Set the webhook URL to `https://your-domain.com/api/whoop/webhook`
3. Subscribe to `workout.updated` events
4. Users connect Whoop in Profile → workouts automatically appear as pre-filled Log entries

## Stamina Score Formula

```
Stamina Score = 40% × Whoop Recovery Score
              + 30% × Weekly Goal Consistency
              + 30% × Lean Mass Stability
```

## Peak Performance Gain

Average % improvement across Volume + Peak for all 3 metrics (push-ups, planks, runs), body-weight normalized by lean mass.

## License

MIT


GRK
# Kinetic

Private premium PWA for a year-long fitness challenge (April 2026 – April 2027). Track push-ups, planks, and running with fair % improvement scoring, real-time Whoop integration, beautiful visualizations, and mutual sharing.

## Challenge Rules
- 3 metrics with hybrid views: **Volume** (weekly totals) + **Peak** (weekly bests)
- Fairness: % improvement from personal 4-week baseline (raw numbers shown side-by-side)
- Weekly aggregates auto-calculated from daily logs

## Key Features
- **Auth**: Google Sign-In + flexible invite-only (admin generates links; no public sign-up)
- **Whoop**: Real-time webhook on workout finish → push notification → pre-filled Log screen (user confirms reps/seconds/distance already entered in Whoop)
- **Logging**: Always-available one-screen form with weekly goal progress bar + per-card “X goal • Y left”, auto-save drafts, offline sync, photo + notes
- **Dashboard**: Personal Trends (your data only) with date-range tabs (This Week / This Month / Last 3mo / Last 6mo / Full Year / Custom) + Volume/Peak + Raw/% Imp toggles + Stamina Score & Peak Gain rings
- **Arena**: Unified leaderboard + history. Filters update table + overlaid chart instantly. Supports mutual sharing
- **Sharing**: Apple Fitness style – search email → double confirmation → recipient gets 3 options (Accept / Accept and start sharing / Reject). All 3 metrics shared. Revoke anytime from Profile
- **Profile**: Avatar upload, Google account, Dark/Light toggle, Performance Goals, logout
- **Stamina & Peak formulas** (see above)
- **PWA**: Installable, offline-first, push notifications, buttery spring animations

## UI Reference
Use the exact 4 Stitch screenshots the user selected (Arena, Dashboard with Pulse Mode, Profile, Log screen) as the visual spec.

## Tech Stack
- Next.js 15 App Router + TypeScript + Tailwind
- Supabase (Auth, Postgres, Realtime, Storage, Edge Functions for Whoop)
- Recharts + TanStack Query + Zod
- Deploy: Vercel (free)

## Future
- More friends via invites
- AI insights
- Weekly auto-recaps
