# Kinetic Project Guide

## Project Overview

Kinetic is a Next.js 15 (App Router) fitness-tracking Progressive Web App (PWA) for a year-long challenge (2026-2027).

- **Core Metrics**: Push-ups (reps), Plank (seconds), Running (km), Squats (reps).
- **Key Features**:
  - **Stamina Score**: 40% Whoop Recovery + 30% Goal Consistency + 30% Lean Mass Stability.
  - **Peak Gain**: Avg % improvement across Volume & Peak for all metrics, body-weight normalized.
  - **Arena**: Real-time unified leaderboard with "Fair Mode" (% improvement ranking).
  - **Whoop Integration**: Real-time workout detection via webhooks and push notifications.
  - **Sharing**: Apple Fitness style mutual sharing with granular RLS visibility.
- **Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts.
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage).
- **PWA**: Offline drafts (`idb-keyval`), background sync, VAPID push notifications.

## Core Scripts

### Development

- `npm run dev`: Starts the development server (port 3000).
- `npm run lint`: Runs ESLint (`ESLINT_USE_FLAT_CONFIG=false`).
- `npm run db:types`: Regenerates types in `src/types/database.ts`.

### Build & Test

- `npm run build`: Production build.
- `npm run uat`: Playwright UAT tests (requires `.auth/user.json`).
- `npm run uat:setup`: Setup Playwright auth via headed browser.

### Database

- `npm run db:migrate`: Pushes migrations to remote Supabase instance.
- `npm run db:reset`: Resets database (local/remote).

## Coding Standards

### React & TypeScript

- **App Router**: Favor Server Components. Use `'use client'` sparingly.
- **Path Aliases**: Always use `@/*` for `src/`.
- **Hooks**: Business logic should reside in custom hooks (`src/hooks/`).
- **Strictness**: No `any` (warn-only, but avoid). Define interfaces for all API/DB data.

### Business Logic Patterns

- **Scoring**: Quadratic continuous curve (`score = base * n + accel * n^2`). See `src/lib/scoring.ts`.
- **Normalization**: Body-weight normalization uses lean mass from Whoop (fallback 75kg).
- **Offline**: Use `idb-keyval` for persistent drafts in logging forms.
- **Real-time**: Use Supabase real-time channels for Arena and Squad updates.

### Styling & UI

- **Design System**: Emerald-green accents (#10B981), deep blacks, glassmorphism.
- **Animations**: 200ms-400ms spring animations via `framer-motion`.
- **Icons**: `lucide-react`.
- **Components**: Radix UI primitives. Consistent use of `k-lg` (22px) and `k-card` shadows.

## Database & RLS

- **Schema**: Profiles, workout_logs, weekly_goals, sharing_relationships, notifications, whoop_events.
- **RLS**: Critical for privacy. Shared users can only see *submitted* logs (not drafts).
- **Migrations**: Found in `supabase/migrations/`.

## Context Rules (Token Efficiency)

- **Prioritize**: `src/app/`, `src/hooks/`, `src/lib/`, `src/components/`, `supabase/migrations/`.
- **Ignore**: `.next/`, `node_modules/`, `public/`, `.npm-cache/`, `backups/`.
- **Focus**: When modifying scoring or stamina, always check `src/lib/scoring.ts` and `src/hooks/use-stamina.ts` first.
- **CLI Rules** : Do not display or echo file contents or code diffs in your text responses. Use Edit/Write
  tools silently.
- And the Text outputs you provide me should be minimalist.
