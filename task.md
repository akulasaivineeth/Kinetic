# Kinetic Project Task Tracker

This tracker aligns the current codebase against the Claude Cowork requirements document.

## 🔐 Auth & Onboarding
- `[x]` **Google Sign-In Only**: Implemented in Supabase config and `page.tsx`.
- `[x]` **Flexible Invite-Only**: The first user becomes the admin and can generate one-time invite links in `profile/page.tsx`.

## ⌚ Whoop Integration
- `[x]` **Real-time Webhook**: `api/whoop/webhook/route.ts` built and captures `workout.updated` events.
- `[x]` **Instant Push Notification**: Handled via `web-push`.
- `[x]` **Tap Notification to Prefill Logs**: Navigates to `/log?activity=X&duration=Y`, prefilling the top of the logging screen.
- `[ ]` **Manual "Import this week" Backup Button**: Needs to be added to the UI (likely at the top of the Log or Dashboard screen) to manually trigger a sync of the past 7 days from Whoop if the webhook fails.

## 📝 Logging Screen
- `[x]` **Always Available**: Central functionality, accessible from bottom nav.
- `[x]` **Weekly Volume Progress Bar**: Calculates `X reps goal • Y remaining` with `ProgressBar`.
- `[x]` **Metric-Specific Goal Tracking**: Individual cards track push-ups, planks, and runs.
- `[x]` **Inputs & Media**: Giant number inputs, photo upload to Supabase Storage, and notes area built.
- `[x]` **Auto-Save Draft & Offline Sync**: Handled by `autoSaveTimer` and `useSaveDraft` locally.
- `[x]` **Big Green "Submit to Arena" Button**: Implemented with loading and success states.

## 📊 Dashboard (Pulse Mode)
- `[x]` **Personal Trends Section**: Displays user's line chart securely.
- `[x]` **Date-Range & Data Toggles**: Tabs for Time (Week, Month, etc.), Volume/Peak, and Raw/% Imp successfully switch states.
- `[ ]` **Real Stamina Score Implementation**: Currently mocked as `staminaScore = 82`. Needs backend logic to calculate: *40% Whoop Recovery + 30% Weekly Goal Consistency + 30% Lean Mass Stability*.
- `[ ]` **Real Peak Gain Implementation**: Currently mocked as `peakGain = 18`. Needs precise calculation across all 3 metrics relative to baseline.

## 🏟️ Arena Screen
- `[x]` **Unified Leaderboard**: Podium for Top 3 and List for the rest cleanly displayed.
- `[x]` **Live Filters**: Toggles seamlessly update the table, podium, and overlaid chart.
- `[x]` **Mutual Sharing Visibility**: Handled directly in Supabase RLS policies (`sharing_connections`).

## 🤝 Sharing (Apple Fitness Style)
- `[x]` **Profile Search by Email**: Built `shareEmail` state and double-confirm sending logic.
- `[x]` **Easy "Remove Sharing"**: Built inside the Profile's active connections dropdown.
- `[ ]` **In-App Notification Center UI**: We have a `notifications` table, but nowhere in the Front-End (like a bell icon) for the recipient to actually see "Bob wants to share data".
- `[ ]` **Interactive 3-Button Flow**: Accept (one-way), Accept Mutual, Reject. Currently missing from the UI for the recipient.
- `[ ]` **Send Email on Share Request**: Hook up Supabase Edge Functions / RESEND to send the target user an email when they receive a share request.

## 🛠️ Environment Configuration & DevOps (Venv Equivalent)
This serves as the centralized place for "environment" tracking, similar to python's venv.
- `[x]` **Local Dependency Environment**: `package.json` initialized. (`npm install` complete).
- `[x]` **Environment Secrets Container**: `.env.local` structured and ignored via `.gitignore` properly.
- `[x]` **Database Migrations (Backend Venv)**: `001_initial_schema.sql` successfully deployed / pushed to the database.
- `[ ]` **Edge Function Deployment**: Whoop webhook functions require `supabase functions deploy whoop-webhook` to be executed.
- `[ ]` **Vercel Deployment**: Link repo and push to production domain.
