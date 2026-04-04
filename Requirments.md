Kinetic – Final Requirements Specification
Version: 1.0 (April 2026)
App Name: Kinetic
Target Users: Private group of 3 friends (expandable via invites)
Goal: Premium dark fitness challenge PWA with fair competition, real-time Whoop integration, and Apple/Strava-level polish.
1. Visual & UX Style (Non-Negotiable)

Must match the 4 chosen Stitch screenshots exactly (Dashboard/Pulse Mode, Arena, Log, Profile).
Dark-first theme with deep blacks, emerald-green accents (#10B981), glassmorphism cards, generous whitespace.
Butter-smooth 200ms spring micro-animations on every tap, card lift, toggle, chart animation.
All interactive elements must feel premium and addictive.

2. Authentication & Access Control

Google Sign-In only.
Invite-only system: Only the first user (admin) can generate invite links from Profile.
No hard limit of 3 users (flexible for future friends).
First user becomes admin automatically.
Unauthorized users see a clean "Access Denied" page explaining that Kinetic is private and an invite is required.

3. Whoop Integration (Realistic Locked Flow)

OAuth scopes: read:workout, read:recovery, read:body_measurement.
Real-time webhook on workout.updated event.
Immediately sends push notification to the user only with exact text:
"Strength Trainer • 42 min • Strain 15.3. Tap to log push-up reps & plank seconds." (values dynamic from Whoop payload).
Tap opens Log screen pre-filled with workout metadata (duration, strain, activity type).
User confirms the exact reps/seconds/distance they already entered in the Whoop app (public API does not return granular Strength Trainer data — this is expected and must be handled gracefully).
Fallback "Import recent workouts" button.

4. Logging Screen (Exact Behavior)

Always available via floating "+" button or Whoop notification.
Top section: Weekly volume progress bar with text "X reps goal • Y remaining".
Each of the 3 metric cards (Push-ups, Plank, Running) must display its own goal remaining text in the top-right corner (e.g. "500 GOAL • 180 LEFT").
Big, easy-to-tap number inputs.
Optional photo upload and notes field.
Auto-save draft + full offline support (syncs automatically when back online).

5. Dashboard – Personal Trends

Shows ONLY the logged-in user's own bold emerald line (no friends by default).
Date-range tabs at the top: This Week | This Month | Last 3 Months | Last 6 Months | Full Year | Custom (with full calendar date picker).
Volume ↔ Peak + Raw ↔ % Imp toggles that instantly update the chart and numbers.
Below the chart: Stamina Score ring (0–100) and Peak Performance Gain ring.

6. Stamina Score & Peak Performance Gain (Exact Formulas)

Stamina Score = 40% Whoop Recovery Score + 30% Weekly Goal Consistency (% of 3 goals hit this week) + 30% Lean Mass Stability (% change from 4-week baseline).
Peak Performance Gain = Average % improvement across all Volume + Peak values for the 3 metrics, body-weight normalized using the latest lean mass from Whoop.
Graceful fallback if data is missing (use 4-week baseline average).

7. Arena Screen (Unified Leaderboard + History)

One unified screen called "Arena".
Top filters: Volume ↔ Peak + Raw ↔ % Imp + date-range tabs.
Filters must instantly update both the podium/table and the overlaid line chart.
Real-time Supabase subscriptions so leaderboard and chart update live the moment any user logs.

8. Sharing Flow (Apple Fitness Style – Exact)

From Profile: search by email → double confirmation dialog before sending request.
Recipient receives in-app notification + email with 3 explicit buttons:
Accept (one-way view)
Accept and start sharing (mutual)
Reject

All 3 metrics are always shared together.
Easy "Remove sharing with [name]" button with confirmation dialog in Profile.

9. Profile Screen

Avatar upload
Connected Google account status
Dark/Light theme toggle
Performance Goals card
Logout button

10. Push Notifications

Full VAPID implementation.
Service worker + subscription flow.
New users see an "Enable Notifications" prompt on first visit.

11. Database & Backend Requirements

All tables and correct RLS policies for:
profiles
workout_logs / entries
weekly_goals
sharing_relationships
whoop_events
notifications

RLS must allow shared users to see only accepted shared logs (not drafts).

12. Other Locked Details

Simple average for all time periods.
PWA with offline support and install prompt.
No public sign-up — only invited users.
CSV export option (nice-to-have but expected).