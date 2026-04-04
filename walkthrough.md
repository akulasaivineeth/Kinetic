# Welcome to the Kinetic Codebase Tour! 🏢

Think of building an app like building a house. We have the foundation, the rooms, the furniture, the plumbing, and the vault. Let's walk through your app step-by-step from the moment someone opens it.

---

## 1. The Welcome Mat & Exterior

When someone types your app's web address into their phone, the browser knocks on your app's front door.

### The `public/` folder
This is the "front yard" of your app. It holds static files that never need to be processed or changed by code.
- **`manifest.json`**: The ID card for your app. It tells the browser "this is a mobile app named Kinetic, use this icon, and run in full-screen." If you lose this, users cannot "Add to Home Screen" or install it as a PWA.
- **`sw.js` (Service Worker)**: The app's "backpack." It secretly downloads essential files in the background so your app can still open in offline mode when you enter a gym with zero reception.

### `src/app/layout.tsx`
This is the **foundation and walls** of the house.
Every single room (page) in your app lives *inside* this file. It wraps your pages with the main navigation bars and necessary themes (like dark mode).
* **If it breaks:** The whole app crashes. There is no structure to hold the rooms!

### `src/app/page.tsx`
This is the **lobby**. 
When a user first opens the app, they land here. It shows the logo and handles the "Sign in with Google" button. If they are already signed in, it automatically redirects them deeper into the house.

---

## 2. The Utilities (`src/providers/`)

Before someone enters the actual rooms, the house needs to have electricity, heating, and water running. In code, we call these "Providers" because they *provide* context to every room in the house at once.

- **`auth-provider.tsx`**: The security guard. It remembers who you are. If you close the app and come back, it tells the app, "Oh, Dave is back, let him straight in." *If missing: Everyone is logged out the second they change pages.*
- **`theme-provider.tsx`**: The lighting system. It holds the dark mode settings.
- **`query-provider.tsx`**: The smart memory board. It manages saving and caching data so the app doesn't redownload your entire workout history every time you pull up a new page.

---

## 3. The Rooms (`src/app/`)

Once past the lobby, the user can visit different rooms. In modern Next.js development, any folder inside `src/app/` with a `page.tsx` file inside it automatically becomes a URL. For example, the `src/app/dashboard/` folder becomes `kinetic.app/dashboard`.

- **`dashboard/page.tsx`**: The command center. It pulls together all your workout statistics, showing you the big pulsing stamina rings and charts.
- **`log/page.tsx`**: The journaling desk. This is the form where you type in your push-ups, planks, and runs.
- **`arena/page.tsx`**: The sports bar. This loads the live leaderboard comparing you against your friends.
- **`profile/page.tsx`**: The mirror. Here you manage your own settings, avatar, and goals.

---

## 4. The Furniture (`src/components/`)

You wouldn't build a new custom chair every time you needed to sit down in a different room; you'd just buy a chair design and place it anywhere. Components are reusable pieces of UI code.

### `src/components/layout/`
- **`bottom-nav.tsx` & `header.tsx`**: The hallways. This is the menu bar at the bottom and top of the screen that lets users walk between rooms easily.

### `src/components/ui/`
- **`glass-card.tsx`, `progress-bar.tsx`, `score-ring.tsx`**: The actual furniture. These are reusable visual elements. For example, the `score-ring.tsx` draws the physical circle for the "Stamina Score." *If you deleted `glass-card.tsx`, every room that relies on a frosty background box would just break and look like scrambled text.*

---

## 5. The Nervous System & Plumbing (`src/hooks/` and `src/lib/`)

Rooms and furniture look nice, but we need plumbing to move the data (the water) around safely.

### The Plumbing (`src/lib/`)
These are the actual pipes connecting your app to the outside world.
- **`supabase/client.ts`**: The magical secure tunnel to your database. *If missing: The app has total amnesia and cannot send or receive any data.*
- **`offline.ts`**: The emergency bucket. If the Wi-Fi drops, this file saves your workout to your phone's memory until the connection comes back.
- **`push.ts`**: The mailman. It asks your phone for permission to send you Push Notifications.

### The Butlers (`src/hooks/`)
Hooks are specialized helpers that handle repetitive chores so that the visual rooms don't have to carry the heavy logic.
- **`use-workout-logs.ts`**: A butler that runs the errand of fetching or saving your workouts. The `log/page.tsx` form just hands data to this hook and says "deal with this."
- **`use-leaderboard.ts`**: A butler that checks the database to calculate who is currently winning the Arena challenge.

---

## 6. The Mailroom / Webhooks (`src/app/api/`)

Sometimes the app receives packages from the outside world without the user doing anything.

- **`api/whoop/webhook/route.ts`**: The receiving dock for Whoop. When your Whoop strap detects you just finished a workout, Whoop's servers hurl a message at this URL. This file catches the message, saves it, and triggers a push notification to your phone saying "Workout detected!". *If missing: Your Whoop metrics will never sync into Kinetic.*

---

## 7. The Vault / Database (`supabase/`)

Everything eventually ends up in the vault to be stored permanently and securely via Supabase.

### `supabase/config.toml`
The vault lock. It configures the local database settings and tells it how to handle Google Logins.

### `supabase/migrations/001_initial_schema.sql`
The blueprints for the filing cabinets inside the vault. It creates structured "tables" (like Excel spreadsheets) to hold the specific pieces of information:
1. **`profiles`**: Holds names, avatars, and Stamina Scores.
2. **`workout_logs`**: A massive list of every single push-up, plank, or run anyone has ever logged.
3. **`whoop_events`**: A temporary bin holding the raw messages sent by Whoop.
*If this was missing: The database would be an empty, confusing warehouse with nowhere to store things systematically.*

---

## 8. The Instruction Manuals (Root Files)

Finally, sitting on the project manager's desk are the manuals. These aren't code your users ever see, but rather rules for how your app gets built.

- **`package.json`**: The shopping list. It tells the server what external tools to download (like "React", "Next.js", and "Tailwind CSS"). *If missing: The app won't even wake up because it lacks its tools.*
- **`tailwind.config.ts`**: The paint dictionary. It tells the app exactly what hex code to use when it hears the word "emerald" or "glass background."
- **`next.config.ts`**: The master rulebook. It tells the infrastructure how to bundle your thousands of files into a fast, highly optimized application.
