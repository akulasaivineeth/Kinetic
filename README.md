# Kinetic — Performance Arena

Private premium PWA for a year-long fitness challenge (April 2026 – April 2027). Track push-ups, planks, and running with fair % improvement scoring, real-time Whoop integration, beautiful visualizations, and mutual sharing.

## Features

### Auth & Access Control
- **Google Sign-In** — no passwords, single tap
- **Invite-only** — admin generates one-time invite links; no public sign-up

### Metrics & Fairness
- **3 metrics**: Push-ups (reps), Plank (seconds), Running (km)
- **Hybrid views**: Volume (weekly totals) + Peak (weekly bests)
- **% improvement** from personal 4-week baseline average
- Toggle between Volume and Peak views everywhere

### Dashboard (Pulse Mode)
- Personal trends chart showing **only your data**
- Date-range tabs: This Week | Month | 3Mo | 6Mo | Year | Custom (with date picker)
- Volume ↔ Peak + Raw ↔ % Imp toggles
- **Stamina Score** ring (0-100): 40% Whoop Recovery + 30% Goal Consistency + 30% Lean Mass Stability
- **Peak Performance Gain** ring: average % improvement across all 6 values

### Arena (Leaderboard)
- Unified leaderboard with podium (top 3) and standings
- Live filters: Volume ↔ Peak + Raw ↔ % Imp + date-range tabs
- **Real-time Supabase subscriptions** — leaderboard updates instantly when anyone logs

### Logging
- Always available via center + button in bottom nav
- Weekly volume progress bar ("500 reps goal • 180 remaining")
- Per-card goal tracking ("500 GOAL • 180 LEFT")
- Big number inputs, optional photo upload + notes
- Auto-save draft + full offline support (syncs when back online)
- **Whoop "Import Recent Workouts"** fallback button

### Whoop Integration
- **OAuth Connect** button in Profile (scopes: read:workout, read:recovery, read:body_measurement)
- Real-time webhook on `workout.updated` → push notification → tap to prefill Log
- Manual import fallback (GET /v2/activity/workout)

### Sharing (Apple Fitness Style)
- Search by email → double confirmation dialog before sending
- Recipient gets in-app notification with **3 buttons**: Accept | Accept & Share (mutual) | Reject
- All 3 metrics shared together
- Easy "Remove sharing" with confirmation in Profile

### Profile
- Avatar upload, Google account info, Whoop connect/disconnect
- Dark/Light mode toggle
- Editable Performance Goals
- **Export Data (CSV)** — downloads all workout logs
- Admin: invite link generator

### Push Notifications
- VAPID-based web push (service worker + subscription flow)
- Notification on Whoop workout detection
- Tap notification → opens prefilled Log screen

### PWA
- Installable on mobile (manifest + service worker)
- Offline-first with idb-keyval draft storage
- Background sync on reconnect

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions)
- **UI**: Framer Motion (spring animations), Recharts (data viz), Glassmorphism design system
- **Data**: TanStack Query, Zod validation, idb-keyval (offline)
- **Deploy**: Vercel (free tier)

## Design System
- Deep black backgrounds (#0A0A0A)
- Emerald-green accents (#10B981)
- Glassmorphism cards with blur(20px)
- 200ms spring micro-animations on every interaction
- SF Pro / system font stack
- Light mode available via toggle

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment (copy and fill in your keys)
cp .env.local.example .env.local

# Run development server
npm run dev
```

## Environment Variables
See `.env.local.example` for all required keys:
- Supabase (URL, Anon Key, Service Role Key)
- Google OAuth (Client ID, Secret)
- Whoop (Client ID, Secret, Webhook Secret)
- VAPID (Public Key, Private Key, Email)
