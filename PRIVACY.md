# Privacy Policy — Kinetic

**Effective Date:** April 3, 2026

## Introduction

Kinetic is a private Progressive Web App built for a small group of friends to track fitness metrics — push-ups, planks, and running — and compete in a friendly performance challenge. This policy explains what data we collect, how we use it, and how we keep it safe.

Kinetic is **not a commercial product**. It is invite-only, privately hosted, and used exclusively by authorized members.

## Information We Collect

- **Account Information:** Your name, email address, and profile photo via Google Sign-In.
- **Fitness Data:** Push-up reps, plank duration, running distance, and optional workout notes and photos that you manually log.
- **Whoop Data (Optional):** If you connect your Whoop account, we receive workout summaries (activity type, duration, strain score) via the Whoop API.
- **Device Tokens:** Push notification tokens for sending you workout alerts, stored securely and used solely for notifications.

We do **not** collect location data, browsing history, contacts, or any data beyond what is listed above.

## How We Use Your Data

Your data is used exclusively to:

- Display your personal fitness dashboard and trends.
- Calculate leaderboard rankings in the Arena.
- Send push notifications when a Whoop workout is detected.
- Track weekly goals and improvement over time.

We do **not** use your data for advertising, analytics profiling, or any purpose other than powering the app for you and your invited friends.

## Data Sharing

Your data is **never sold** to third parties.

Data is shared only with the following authorized services required to run the app:

- **Google** — for authentication (Sign-In).
- **Supabase** — for secure database storage and user authentication.
- **Whoop** — only if you opt into the Whoop integration, and limited to workout data.
- **Vercel** — for hosting the application.

Fitness data is visible only to users you have explicitly accepted a mutual sharing connection with inside the app.

## Data Storage and Security

All data is stored in a Supabase Postgres database protected by Row Level Security (RLS) policies, ensuring users can only access their own data and data explicitly shared with them. Communication between the app and the server is encrypted via HTTPS/TLS.

## Your Rights

Since this is a private app among friends, you can:

- **View** all data associated with your account at any time.
- **Delete** your account and all associated data by requesting removal from the admin.
- **Revoke sharing** with any connected user instantly from your Profile.
- **Disconnect Whoop** at any time to stop receiving automated workout data.

## Contact

For questions or data removal requests, contact the app administrator directly.

---

*This policy may be updated occasionally. Changes will be communicated to all active members.*
