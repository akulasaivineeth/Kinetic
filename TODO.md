# KINETIC — Master TODO Checklist

> Last updated: April 6, 2026
> Status: **In Development** — Core features built, bugs being fixed, deployment pending

---

## 1. PROJECT SCAFFOLDING & CONFIG

### 1.1 Next.js 15 Setup
- [x] Initialize project with `package.json`
- [x] Configure `tsconfig.json` with path aliases (`@/*`)
- [x] Configure `next.config.ts` (image remotes, security headers)
- [x] Configure `tailwind.config.ts` (dark theme, emerald palette, spring keyframes)
- [x] Configure `postcss.config.js`
- [x] Create `next-env.d.ts`
- [x] Exclude `supabase/functions` from TypeScript compilation

### 1.2 Dependencies
- [x] Install core: `next`, `react`, `react-dom`
- [x] Install Supabase: `@supabase/supabase-js`, `@supabase/ssr`
- [x] Install data: `@tanstack/react-query`, `zod`, `date-fns`
- [x] Install UI: `framer-motion`, `recharts`, `clsx`, `lucide-react`
- [x] Install PWA: `idb-keyval`, `web-push`
- [x] Install date picker: `react-day-picker`, `@radix-ui/react-popover`
- [x] Install dev: `typescript`, `eslint`, `eslint-config-next`, `tailwindcss`, `postcss`, `autoprefixer`
- [x] Generate `package-lock.json`
- [x] `node_modules` installed successfully

### 1.3 Environment & Secrets
- [x] Create `.env.local.example` template with all keys
- [x] Create actual `.env.local` with real Supabase keys
- [x] Supabase URL configured
- [x] Supabase Anon Key configured
- [x] Supabase Service Role Key configured
- [ ] Google OAuth Client ID configured
- [ ] Google OAuth Client Secret configured
- [ ] Whoop Client ID configured
- [ ] Whoop Client Secret configured
- [ ] Whoop Webhook Secret configured
- [ ] VAPID Public Key generated and configured
- [ ] VAPID Private Key generated and configured
- [ ] VAPID Email configured

### 1.4 Git & Repository
- [x] Initialize git repo
- [x] Create `.gitignore` (node_modules, .env, .next, etc.)
- [x] Initial commit
- [x] 17 commits pushed to `main`
- [x] Remote set: `https://github.com/akulasaivineeth/Kinetic`
- [x] Code pushed to GitHub
- [ ] Set up branch protection rules on `main`
- [ ] Add GitHub Actions CI/CD pipeline

---

## 2. DATABASE & BACKEND (Supabase)

### 2.1 Schema — Tables
- [x] `profiles` table (id, email, full_name, avatar_url, is_admin, theme, whoop tokens, push_subscription)
- [x] `invite_links` table (code, created_by, used_by, expires_at)
- [x] `performance_goals` table (pushup/plank/run weekly + peak goals per user)
- [x] `workout_logs` table (pushup_reps, plank_seconds, run_distance, whoop data, photo, notes, draft/submitted)
- [x] `sharing_connections` table (requester, recipient, status enum, is_mutual)
- [x] `notifications` table (user_id, type, title, body, data JSONB, read)
- [x] `whoop_events` table (audit log for webhook payloads)
- [x] Add `unit_preference` column to profiles (migration 002)
- [x] Final polish migration (20260404)

### 2.2 Schema — Functions
- [x] `get_weekly_volume()` — SUM of pushups/planks/runs for current week
- [x] `get_leaderboard()` — volume/peak × raw/percent with sharing filter
- [x] `handle_new_user()` trigger — auto-create profile, first user = admin

### 2.3 Row Level Security (RLS)
- [x] Profiles: own profile read/update + shared profiles read
- [x] Invite links: admin create/view + anyone can read valid unused codes
- [x] Performance goals: own CRUD + shared users read
- [x] Workout logs: own CRUD + shared users read submitted logs only
- [x] Sharing connections: own view + requester create + recipient update + either delete
- [x] Notifications: own view/update
- [x] Whoop events: own view

### 2.4 Storage Buckets
- [x] `avatars` bucket (public read, user-folder write)
- [x] `workout-photos` bucket (public read, user-folder write)

### 2.5 Realtime Subscriptions
- [x] `workout_logs` added to realtime publication
- [x] `notifications` added to realtime publication
- [x] `sharing_connections` added to realtime publication

### 2.6 Edge Functions
- [x] `whoop-webhook` — receives Whoop events, creates notifications, sends push
- [x] `sharing-notification` — sends email on new sharing request
- [ ] Deploy `whoop-webhook` to Supabase (`supabase functions deploy`)
- [ ] Deploy `sharing-notification` to Supabase
- [ ] Set Edge Function secrets (VAPID keys, Whoop webhook secret)

### 2.7 Migrations
- [x] `001_initial_schema.sql` — full schema, RLS, functions, storage
- [x] `002_add_unit_preference.sql` — unit_preference column
- [x] `20260404_final_polish.sql` — refinements
- [x] Run migrations against live Supabase project
- [ ] Verify all RLS policies work with real data
- [ ] Test leaderboard function with multiple users + sharing

---

## 3. AUTHENTICATION & ACCESS CONTROL

### 3.1 Google OAuth
- [x] Supabase Auth provider config in `supabase/config.toml`
- [x] Auth callback route (`/auth/callback/route.ts`)
- [x] Code-for-session exchange
- [x] Auto-create profile on first sign-in (trigger)
- [x] First user auto-becomes admin
- [ ] Create Google Cloud Console project
- [ ] Configure OAuth consent screen
- [ ] Create OAuth 2.0 credentials (Client ID + Secret)
- [ ] Add authorized redirect URIs (localhost + production)
- [ ] Enable Google provider in Supabase dashboard
- [ ] Test full Google sign-in flow end-to-end

### 3.2 Invite-Only Access
- [x] Invite link generation (admin only, via profile page)
- [x] One-time invite code validation in auth callback
- [x] Invite code consumption (mark used_by + used_at)
- [x] Deny non-first users without valid invite code
- [x] `/unauthorized` page for rejected users
- [x] 7-day expiration on invite links

### 3.3 Auth Provider & Middleware
- [x] `AuthProvider` context (user, profile, loading, signIn, signOut)
- [x] `useAuth()` hook
- [x] Next.js middleware for route protection
- [x] Redirect unauthenticated users to `/`
- [x] Redirect authenticated users from `/` to `/dashboard`
- [x] Exclude `/auth`, `/api`, and static assets from protection

---

## 4. UI DESIGN SYSTEM

### 4.1 Global Styles
- [x] `globals.css` — CSS variables, glassmorphism classes, scrollbar, transitions
- [x] Dark theme (#0A0A0A bg, #141414 cards, #10B981 emerald)
- [x] Light theme overrides (CSS variable swap)
- [x] SF Pro / system font stack
- [x] Custom scrollbar styling
- [x] Number input spinner removal
- [x] Safe area padding for PWA
- [x] `.emerald-gradient` and `.emerald-glow` utility classes
- [x] `.glass-card` and `.glass-card-elevated` classes
- [x] `.tab-active` / `.tab-inactive` classes
- [x] `.transition-spring` class (200ms cubic-bezier)

### 4.2 Reusable Components
- [x] `GlassCard` — glassmorphism container with spring entrance animation
- [x] `ScoreRing` — animated SVG circular progress (Stamina Score, Peak Gain)
- [x] `TogglePills` — Volume/Peak, Raw/% Imp toggle buttons with layoutId animation
- [x] `DateRangeTabs` — WEEK/MONTH/3MO/6MO/YEAR/CUSTOM with animated indicator
- [x] `ProgressBar` — weekly volume progress bar with spring fill animation
- [x] Custom date picker (react-day-picker + Radix Popover) for CUSTOM range

### 4.3 Layout Components
- [x] `AppShell` — max-width container, header, main, bottom nav, notification prompt
- [x] `BottomNav` — 4 tabs (Dashboard, Arena, +Log, Profile) with emerald center button
- [x] `Header` — avatar, KINETIC logo, dynamic rank badge, notification bell
- [x] `PWAInit` — registers service worker + push subscription on mount
- [x] Notification permission prompt (auto-shows after 3 seconds)
- [x] Notification bell with unread count badge
- [x] Notification dropdown with sharing request 3-button flow (Accept/Accept & Share/Reject)

---

## 5. SCREENS

### 5.1 Landing Page (`/`)
- [x] Kinetic logo (emerald gradient lightning bolt)
- [x] "KINETIC" title + "Performance Arena" subtitle
- [x] "Continue with Google" button with Google icon
- [x] Invite code detection from URL (`?invite=...`)
- [x] "YOU'VE BEEN INVITED" badge when invite present
- [x] Suspense boundary wrapper
- [x] Loading state during sign-in
- [x] Version badge at bottom

### 5.2 Dashboard (`/dashboard`) — PULSE MODE
- [x] "SYSTEM STATUS / PULSE MODE" header
- [x] "THIS WEEK'S ARENA" section with Volume/Peak toggle
- [x] Push-ups metric card (value, % change, leader name, sparkline)
- [x] Plank metric card (value in minutes, % change, leader name, sparkline)
- [x] Running metric card (value in km/mi, % change, leader name, sparkline)
- [x] Dynamic leader names from leaderboard data (not hardcoded)
- [x] Unit preference support (metric/imperial) for run distance
- [x] Average per week calculation for longer date ranges
- [x] "PERSONAL TRENDS" section header
- [x] Date range tabs (WEEK/MONTH/3MO/6MO/YEAR/CUSTOM)
- [x] Volume ↔ Peak toggle
- [x] Raw ↔ % Imp toggle
- [x] 8-WEEK VELOCITY chart (Recharts LineChart, emerald line, dark tooltip)
- [x] Velocity points + % improvement stats
- [x] Stamina Score ring (value from `useStamina` hook)
- [x] Peak Performance Gain ring
- [x] CSV Export button
- [x] Custom date picker integration
- [ ] **BUG: Dashboard doesn't refresh after submitting a log** (leaderboard cache not invalidated)
- [ ] Real Stamina Score calculation (currently uses mock/estimate)
- [ ] Apple Health / HealthKit integration for lean mass stability data

### 5.3 Log Screen (`/log`)
- [x] "CURRENT SESSION" header with Whoop prefill (activity, duration, strain)
- [x] Weekly volume progress bar with goal/remaining
- [x] Push-up Reps card — big number input, goal/left indicator
- [x] Plank Seconds card — MM:SS split input, goal/left indicator
- [x] Run Distance card — decimal input, goal/left in KM or MI
- [x] Photo upload card (Supabase Storage `workout-photos` bucket)
- [x] Notes textarea
- [x] "SUBMIT TO ARENA" button (emerald gradient, send icon)
- [x] Auto-save draft every 2 seconds (debounced)
- [x] Load existing draft on mount
- [x] Offline draft persistence (IndexedDB via idb-keyval)
- [x] Online sync to Supabase when connected
- [x] Whoop query params prefill (`?activity=...&duration=...&strain=...`)
- [x] "IMPORT RECENT WORKOUTS" button (Whoop manual import fallback)
- [x] Unit conversion (imperial ↔ metric) for run distance
- [x] Suspense boundary wrapper
- [x] Submit success animation ("SUBMITTED ✓")
- [x] Form reset after successful submit
- [x] `onWheel` blur to prevent accidental scroll-changes on number inputs
- [ ] **BUG: No redirect to dashboard after successful submit**
- [ ] **BUG: Leaderboard cache not invalidated after submit** (dashboard stale)
- [ ] Camera capture option (not just file picker)

### 5.4 Arena Screen (`/arena`) — LIVE RANKINGS
- [x] "ARENA / LIVE RANKINGS" header
- [x] LIVE indicator badge (pulsing green dot)
- [x] Volume ↔ Peak toggle pills
- [x] Raw ↔ % Imp toggle pills
- [x] Date range tabs (WEEK/MONTH/3MO/6MO/YEAR/CUSTOM)
- [x] Podium — top 3 with avatars, names, scores (2nd-1st-3rd layout)
- [x] Star icon on 1st place
- [x] Rank badges on 2nd/3rd
- [x] "YOU" label for current user
- [x] Intensity Velocity chart (Recharts LineChart)
- [x] Your line (solid emerald) + shared friends (dashed gray)
- [x] Chart legend with user names
- [x] Overlaid shared workout logs on chart
- [x] Detailed Standings table with rank, avatar, name, score, trend
- [x] Emerald highlight on your own row
- [x] Special styling for top 3 ranks
- [x] CSV Export button for arena data
- [x] Custom date picker integration
- [x] Empty state when no data
- [x] Real-time Supabase subscription (auto-refresh on new workout logs)
- [ ] Animate rank changes (e.g., flash when someone moves up)
- [ ] Pull-to-refresh gesture on mobile

### 5.5 Profile Screen (`/profile`)
- [x] Avatar with emerald gradient ring + edit (upload) button
- [x] Full name display
- [x] "ELITE MEMBER" badge
- [x] Account Identity section
  - [x] Full Name card with chevron
  - [x] Connected Google Account card with email + "CONNECTED" badge
  - [x] Whoop connection card (connected status or "CONNECT" link)
- [x] System & Goals section
  - [x] Dark Mode toggle (spring-animated switch)
  - [x] Unit Preference toggle (Metric/Imperial)
  - [x] Performance Goals expandable editor (6 goal fields)
  - [x] Goals save on blur with `onWheel` prevention
- [x] Sharing section (expandable)
  - [x] Search by email input
  - [x] Double confirmation before sending request
  - [x] Active connections list
  - [x] "REMOVE" button with double-confirm flow
- [x] Invite Links section (admin only, expandable)
  - [x] "GENERATE NEW INVITE LINK" button
  - [x] Display generated link
  - [x] "COPY TO CLIPBOARD" button
- [x] "DEACTIVATE SESSION" / Logout button (red, with icon)
- [x] Version badge ("KINETIC PWA V4.2.0 • BUILD 2026")
- [ ] Edit full name inline
- [ ] Whoop disconnect button (currently only shows connect)
- [ ] Export all data as CSV from profile

### 5.6 Unauthorized Page (`/unauthorized`)
- [x] Page exists with access denied message
- [ ] Polish design to match Kinetic style
- [ ] "Request Access" or "Enter Invite Code" option

---

## 6. DATA HOOKS & STATE MANAGEMENT

### 6.1 TanStack Query Hooks
- [x] `useWorkoutLogs(dateRange, customFrom, customTo)` — fetch submitted logs
- [x] `useWeeklyVolume()` — call `get_weekly_volume` RPC
- [x] `useDraftLog()` — fetch current draft (IndexedDB + Supabase)
- [x] `useSaveDraft()` — save draft to IndexedDB + Supabase (if online)
- [x] `useSubmitLog()` — mark draft as submitted, clean up IndexedDB
- [x] `useSharedLogs(dateRange, ...)` — fetch shared users' logs for arena chart
- [x] `useLeaderboard(dateRange, metric, mode, ...)` — call `get_leaderboard` RPC
- [x] `useGoals()` — fetch user's performance goals
- [x] `useUpdateGoals()` — upsert goals
- [x] `useSharingConnections()` — fetch all connections with user profiles
- [x] `useSendSharingRequest()` — create connection + notification + email
- [x] `useRespondToSharing()` — accept/accept_mutual/reject
- [x] `useRemoveSharing()` — delete connection
- [x] `useNotifications()` — fetch notifications + realtime subscription
- [x] `useMarkNotificationRead()` — mark notification as read
- [x] `useStamina()` — calculate stamina score + peak gain

### 6.2 Cache Invalidation
- [x] Draft log invalidated after save
- [x] Workout logs invalidated after submit
- [x] Weekly volume invalidated after submit
- [x] Stamina invalidated after submit
- [ ] **BUG: Leaderboard NOT invalidated after submit** ← needs fix
- [x] Sharing connections invalidated after send/respond/remove
- [x] Leaderboard invalidated after sharing changes
- [x] Notifications invalidated via realtime subscription

### 6.3 Realtime Subscriptions
- [x] Notifications channel — INSERT on `notifications` table
- [x] Leaderboard channel — INSERT/UPDATE on `workout_logs` table
- [x] Shared logs channel — all changes on `workout_logs` table
- [x] Unique channel IDs (randomized to prevent conflicts)

### 6.4 Offline Support
- [x] IndexedDB draft storage via `idb-keyval`
- [x] `saveDraftOffline()` / `getDraftOffline()` / `deleteDraftOffline()`
- [x] Check `navigator.onLine` before Supabase calls
- [x] Service worker `sync` event handler
- [x] `kinetic-sync-drafts` custom event dispatch
- [ ] Test offline → online sync flow end-to-end
- [ ] Handle conflict resolution (offline draft vs server draft)

---

## 7. WHOOP INTEGRATION

### 7.1 OAuth Flow
- [x] `/api/whoop/auth` route — redirect to Whoop OAuth
- [x] `/api/whoop/callback` route — exchange code for tokens, store in profile
- [ ] Register app at developer.whoop.com
- [ ] Configure OAuth scopes (read:workout, read:recovery, read:body_measurement)
- [ ] Set callback URL in Whoop developer portal
- [ ] Test full OAuth connect flow
- [ ] Implement token refresh logic (when access token expires)
- [ ] Whoop disconnect flow in profile

### 7.2 Webhook
- [x] `/api/whoop/webhook` Next.js API route (signature verification, event processing)
- [x] Supabase Edge Function `whoop-webhook` (Deno runtime)
- [x] `workout.updated` event handling
- [x] Activity type, duration, strain extraction
- [x] In-app notification creation
- [x] Push notification via VAPID/web-push
- [x] Notification deep-links to `/log?activity=...&duration=...&strain=...`
- [x] Event audit logging to `whoop_events` table
- [ ] Register webhook URL at developer.whoop.com
- [ ] HMAC SHA256 signature verification (currently simplified)
- [ ] Handle other event types (recovery.updated, etc.)

### 7.3 Manual Import
- [x] `/api/whoop/import` route — fetch recent workouts via Whoop API
- [x] "IMPORT RECENT WORKOUTS" button on Log screen
- [x] Import result feedback (count of imported workouts)
- [ ] Test with real Whoop API data
- [ ] Handle pagination for users with many workouts
- [ ] Deduplicate already-imported workouts

---

## 8. SHARING (Apple Fitness Style)

### 8.1 Send Request
- [x] Search by email input in Profile
- [x] Double confirmation dialog before sending
- [x] Create `sharing_connections` row (status: pending)
- [x] Create in-app notification for recipient
- [x] Invoke `sharing-notification` Edge Function for email
- [ ] Validate recipient exists before showing confirm
- [ ] Prevent duplicate requests to same user
- [ ] Rate limit sharing requests

### 8.2 Receive & Respond
- [x] In-app notification with 3 buttons: Accept / Accept & Share (mutual) / Reject
- [x] `useRespondToSharing` hook handles all 3 actions
- [x] Update connection status + is_mutual flag
- [x] Mark notification as read after responding
- [x] Cache invalidation (connections + leaderboard)
- [ ] Email notification with 3 action buttons (Edge Function exists but needs testing)

### 8.3 Active Sharing
- [x] List active connections in Profile
- [x] Remove sharing with double-confirm flow
- [x] RLS allows viewing shared users' submitted workout logs
- [x] Arena leaderboard includes shared users
- [x] Arena chart overlays shared users' data
- [ ] Show "pending" requests separately from "accepted"
- [ ] Notification when someone accepts your request

---

## 9. PWA & PUSH NOTIFICATIONS

### 9.1 Manifest & Icons
- [x] `manifest.json` (name, short_name, start_url, display, theme, icons)
- [x] `icon-192.svg` (emerald lightning bolt on dark bg)
- [x] `icon-192.png` (raster version)
- [ ] `icon-512.png` (high-res for splash screens)
- [ ] Apple touch icon configured in `<head>`
- [ ] Splash screen images for iOS

### 9.2 Service Worker
- [x] `sw.js` — cache static assets, network-first fetch strategy
- [x] Push notification handler (`push` event)
- [x] Notification click handler — navigate to `/log` with deep-link data
- [x] Background sync handler (`sync` event for `sync-drafts`)
- [x] Cache cleanup on activate
- [ ] Cache versioning strategy for updates
- [ ] Precache critical routes during install
- [ ] Handle service worker update prompt for users

### 9.3 Push Notifications
- [x] `subscribeToPush()` function with VAPID key conversion
- [x] `/api/push/subscribe` route — save subscription to profile
- [x] Push from Edge Function (whoop-webhook)
- [x] Push from Next.js API route (whoop webhook)
- [x] Error handling for invalid VAPID keys
- [ ] Generate real VAPID keys (`npx web-push generate-vapid-keys`)
- [ ] Test push notification delivery end-to-end
- [ ] Handle subscription expiration/renewal

---

## 10. VALIDATION & ERROR HANDLING

### 10.1 Zod Schemas
- [x] `workoutLogSchema` (pushup_reps, plank_seconds, run_distance, run_duration, notes, photo_url)
- [x] `performanceGoalsSchema` (all 6 goal fields with min/max)
- [x] `sharingRequestSchema` (email validation)
- [ ] Apply Zod validation on form submit (currently trusts input directly)
- [ ] Server-side validation on API routes

### 10.2 Error Handling
- [x] Try/catch in all API routes
- [x] Error logging in webhook handlers
- [x] Graceful VAPID key failure handling
- [ ] User-facing error toasts/banners
- [ ] Error boundary component (React Error Boundary)
- [ ] 404 page
- [ ] API rate limiting

---

## 11. KNOWN BUGS TO FIX

- [ ] **Log → Dashboard stale data**: `useSubmitLog` does not invalidate `leaderboard` query key
- [ ] **No navigation after submit**: Log form stays on `/log` after successful submit instead of redirecting to `/dashboard`
- [ ] **Duplicate stamina invalidation**: `useSubmitLog` calls `invalidateQueries({ queryKey: ['stamina'] })` twice
- [ ] **Bottom nav clicks**: Verify `<Link>` components work with App Router (no `router.push` needed — just `next/link`)
- [ ] Test that real-time subscription channel cleanup doesn't cause memory leaks

---

## 12. DEPLOYMENT

### 12.1 Vercel
- [ ] Connect GitHub repo to Vercel
- [ ] Set all environment variables in Vercel dashboard
- [ ] Configure production domain
- [ ] Verify build succeeds (`next build`)
- [ ] Test production deployment end-to-end
- [ ] Set up preview deployments for PRs

### 12.2 Supabase Production
- [x] Supabase project created (ID: `oufmzbpdzdwxdlhddpzt`)
- [x] Migrations applied
- [ ] Deploy Edge Functions
- [ ] Configure Google OAuth redirect for production domain
- [ ] Enable email confirmations (if desired)
- [ ] Set up database backups
- [ ] Monitor RLS policy performance

### 12.3 External Services
- [ ] Google Cloud Console — OAuth credentials for production
- [ ] Whoop Developer Portal — app registration + webhook URL
- [ ] VAPID keys generated and deployed
- [ ] Custom domain (if applicable)
- [ ] SSL certificate (handled by Vercel)

---

## 13. DOCUMENTATION

- [x] `README.md` — features, tech stack, getting started, env vars
- [x] `PRIVACY.md` — privacy policy
- [x] `Requirments.md` — full requirements specification
- [x] `.env.local.example` — all required environment variables
- [x] `walkthrough.md` — feature walkthrough
- [x] `task.md` — task tracking
- [x] This `TODO.md` — comprehensive checklist
- [ ] API documentation (webhook endpoints, response formats)
- [ ] Contributing guide
- [ ] Architecture diagram

---

## 14. TESTING & QA

- [ ] Manual test: Google sign-in → dashboard loads
- [ ] Manual test: Log a workout → submit → dashboard updates
- [ ] Manual test: Arena shows your data after submit
- [ ] Manual test: Invite link generation → new user sign-up with code
- [ ] Manual test: Send sharing request → recipient accepts → mutual data visible
- [ ] Manual test: Whoop import button works with real Whoop account
- [ ] Manual test: Offline draft save → go online → draft syncs
- [ ] Manual test: Push notification received → tap → Log screen opens with prefill
- [ ] Manual test: Dark/Light mode toggle
- [ ] Manual test: Unit preference (metric ↔ imperial) affects all distance displays
- [ ] Manual test: CSV export from Dashboard and Arena
- [ ] Manual test: Custom date picker works on all screens
- [ ] Mobile responsive: test on iPhone, Android
- [ ] PWA install: test "Add to Home Screen" on iOS Safari and Android Chrome
- [ ] Performance: Lighthouse audit (target >90 on all categories)
- [ ] Accessibility: screen reader, keyboard navigation
- [ ] Write unit tests for utility functions
- [ ] Write integration tests for API routes

---

## SUMMARY

| Category | Done | Remaining | % Complete |
|----------|------|-----------|------------|
| Scaffolding & Config | 17 | 3 | 85% |
| Database & Backend | 27 | 4 | 87% |
| Authentication | 14 | 6 | 70% |
| UI Design System | 22 | 0 | 100% |
| Screens (5 total) | 62 | 12 | 84% |
| Data Hooks & State | 24 | 3 | 89% |
| Whoop Integration | 13 | 8 | 62% |
| Sharing | 12 | 4 | 75% |
| PWA & Push | 11 | 6 | 65% |
| Validation & Errors | 4 | 5 | 44% |
| Known Bugs | 0 | 5 | 0% |
| Deployment | 2 | 10 | 17% |
| Documentation | 7 | 3 | 70% |
| Testing & QA | 0 | 17 | 0% |
| **TOTAL** | **215** | **86** | **71%** |
