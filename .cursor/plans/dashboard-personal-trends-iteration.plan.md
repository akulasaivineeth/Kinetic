---
name: Dashboard Personal Trends iteration
overview: Personal Trends — week = dual line + overlays; multi-week = Whoop-style weekly bars + 4-wk AVG; plank in minutes; Velocity/rings later.
todos:
  - id: clarify-last-week
    content: Peak+% B; Volume+% week vs multi-week; Whoop bar mode — locked in §6
    status: completed
  - id: implement-chart-toggles
    content: dashboard/page.tsx — LineChart week mode + BarChart multi-week + ReferenceLine AVG; overlays per §6
    status: pending
  - id: velocity-stamina-later
    content: Redefine Performance Velocity + rings after chart review
    status: pending
---

# Dashboard “Personal Trends” — requirements vs build (iteration doc)

**Scope:** [`/dashboard`](src/app/dashboard) — **Personal Trends** first (date tabs, Push | Plank | Run, Volume/Peak, Raw/% Imp, chart). **Deferred:** Performance Velocity headline, Stamina / Peak Gain rings. **Out of scope:** Arena, Profile, Log.

---

## 1. Original requirements (source of truth)

From [`Requirments.md`](Requirments.md) (v1.0, April 2026):

### §5 Dashboard – Personal Trends

- Shows **ONLY** the logged-in user’s **bold emerald line** (no friends by default).
- **Date-range tabs:** This Week | This Month | Last 3 Months | Last 6 Months | Full Year | Custom (full calendar date picker).
- **Volume ↔ Peak** and **Raw ↔ % Imp** toggles that **instantly update the chart and numbers**.
- **Below the chart:** **Stamina Score** ring (0–100) and **Peak Performance Gain** ring.

### §6 Stamina Score & Peak Performance Gain (exact formulas)

- **Stamina Score** = 40% Whoop Recovery Score + **30% Weekly Goal Consistency (% of 3 goals hit this week)** + 30% Lean Mass Stability (% change from 4-week baseline).
- **Peak Performance Gain** = Average % improvement across **all Volume + Peak values for the 3 metrics**, body-weight normalized using latest lean mass from Whoop; graceful fallback (e.g. 4-week baseline average).

### §12 (partial)

- “**Simple average** for all time periods.” (Brief; applies globally in the doc — needs your interpretation for Personal Trends bucketing.)

**Note:** The requirements doc does **not** spell out: composite formula `pushups + plank/6 + run*10`, **first-bucket % baseline** vs **prior-period %**, or the meaning of **“Performance Velocity”** as a headline number. Those are implementation choices to validate against your intent.

---

## 2. Implementation checklist (what shipped) — [`TODO.md`](TODO.md) §5.2

Marked done for this area:

- PERSONAL TRENDS header; date tabs WEEK/MONTH/3MO/6MO/YEAR/CUSTOM; Volume/Peak; Raw/% Imp; Recharts line + tooltip; “velocity points + % improvement stats”; Stamina + Peak rings from `useStamina`; CSV export; custom picker.

Open items still noted in repo (may affect “meets §6”):

- “Real Stamina Score” / was mock — codebase now has a fuller [`useStamina`](src/hooks/use-stamina.ts) hook (verify vs exact §6 wording).
- Apple Health for lean mass — not in scope unless you add it.

---

## 3. As-built behavior (Personal Trends only) — short matrix

| Topic | Requirements expectation | Current implementation (summary) |
|--------|---------------------------|----------------------------------|
| Who is on the chart? | Only current user, one emerald line | Yes — single series from `buildPersonalTrendChart` + your logs only |
| Date tabs | Week / Month / 3MO / 6MO / Year / Custom | Matches [`DateRangeTabs`](src/components/ui/date-range-tabs.tsx) labels (WEEK, MONTH, 3MO, …) |
| Volume | Toggle updates chart + numbers | **Volume** = per-session sum `pushups + plank_sec/6 + run_km*10`; aggregated by day then by range rules |
| Peak | Toggle updates chart + numbers | **Peak** = per-session `max(pushups, plank_sec/6, run_km*10)`; per day = max of sessions; longer ranges bucket (week avg of dailies for MONTH; monthly max of daily peaks for 3MO+) |
| Raw vs % Imp | Instantly updates chart + numbers | **Raw** = bucket value in composite units. **% Imp** = **first bucket in time order = baseline**; points = `((raw−baseline)/baseline)*100` |
| “Numbers” next to chart | Req says toggles update “chart and numbers” | Headline: **average step change** `(last−first)/(n−1)` on the **same** series, shown as `abs` + `.toFixed(1)` + label pts or %. **IMPROVEMENT** line = `stamina.peakGain` (§6 formula), **not** derived from the chart toggles |
| Tooltips | Not specified | Recharts default — can show **many decimals** |
| Below chart rings | Stamina 0–100 + Peak Gain | [`useStamina`](src/hooks/use-stamina.ts): composite stamina; peak gain = 4wk vs 8wk six-metric average % (BW-normalized) |
| §6 Goal consistency | “% of 3 goals **hit** this week” | Implemented as **average of fractional progress** toward each goal (0–100), not binary 0/100 per goal |

---

## 4. Superseded — replaced by §6 user direction

Earlier open questions about composite vs per-metric are **resolved** for the chart layer: user wants **explicit Push | Plank | Run** first, then Volume/Peak and Raw/% Imp scoped to that metric.

---

## 5. Deferred (after chart is correct)

Do **not** redesign until the chart behavior is implemented and reviewed:

- **Performance Velocity** headline + subtext
- **Stamina / Peak Gain** rings (§6) and whether they echo chart toggles

---

## 6. Locked spec — Personal Trends chart only (user direction)

**UI structure (top → bottom within Personal Trends):**

1. **Date-range tabs** (unchanged): WEEK | MONTH | 3MO | 6MO | YEAR | CUSTOM.
2. **Category row (new):** **PUSH-UPS** | **PLANK** | **RUN** — exactly one selected; filters which field(s) feed the chart.
3. **Aggregation + display (existing pattern, two dimensions):**
   - **Volume ↔ Peak** (default **Volume**).
   - **Raw ↔ % IMP.** (default **Raw**).
   - Together: default state **Volume + Raw** for the selected category.

**Data definition (per category, natural units):**

| Category | Raw “volume” for a day | Raw “peak” for a day |
|----------|-------------------------|----------------------|
| Push-ups | Sum of `pushup_reps` across all sessions that day | Max `pushup_reps` among sessions that day |
| Plank | Sum of `plank_seconds` that day (store seconds; **display minutes** in UI) | Max `plank_seconds` that day (display **minutes**) |
| Run | Sum of `run_distance` (km internally; display via unit pref) that day | Max `run_distance` that day |

**Whoop-inspired UX (reference):** [WHOOP Trend Views](https://www.whoop.com/us/en/thelocker/track-progress-with-new-trend-views) describe **weekly / monthly / 6‑month** trends with **bars** and **averages** for comparison—not only daily lines. Your screenshot (HR zones 4–5) shows **one bar per week**, a **dashed horizontal “AVG.”** line = **four‑week average**, summary copy comparing **last 7 days vs 4‑week average**, and **segmented bar** (two orange tones + inner marker). Kinetic should mirror that **pattern** for **ranges longer than one ISO week** (see below). Design ref: user-provided Whoop screenshot (`IMG_5358` in Cursor project assets — weekly bars, dashed **AVG.** line, segmented bar).

---

### A. Range = **single ISO week** (WEEK tab or custom ~7 days)

**Single chart surface:** Switching Volume ↔ Peak **does not** swap chart component type—same `LineChart` updates data; **Peak + Raw** adds a **marker** on the **best day** in that visible week.

- **Volume + Raw:** **Line graph**, one point per **calendar day** in the week; Y = **daily total** for the category. **Overlay:** second line = **previous ISO week’s same weekday values** (e.g. this Monday vs last Monday’s total on aligned Mon–Sun axis)—**raw** overlay (“what you did that day last week”).

- **Volume + % IMP. (one sentence, week / daily):** Each day’s **daily volume** vs **the same weekday in the immediately previous ISO week**: `((Vₜ − Vₜ₋₇d) / Vₜ₋₇d) × 100` (same **rule B** as Peak + %); denominator 0 → show 0 or “—” per implementation.

- **Peak + Raw:** Same line chart; Y = **max single-session** that day; **highlight** global max in the visible week. **Overlay (Peak + %):** prior week’s **day-wise % improved** series (rule B chain) as second line, as already locked.

- **Peak + % IMP.:** Unchanged — **option B** vs same weekday prior week.

---

### B. Range **longer than one week** (MONTH, 3MO, 6MO, YEAR, long Custom)

- **Do not** use a second line as the primary comparison. Use a **week-by-week bar chart** (Whoop-style): **X** = week buckets (labeled like `Mar 13–19`), **Y** = chosen metric:
  - **Volume + Raw:** **total volume for that ISO week** (sum of daily totals).
  - **Peak + Raw:** Bar height = **max daily peak within that ISO week** (user-confirmed).
- **Horizontal dashed reference line “AVG.”** = **mean of the last four completed week-buckets** in view (or trailing 4 weeks ending at latest bar—match copy in UI to Whoop: e.g. “vs your weekly average from the last four weeks”).
- **Optional enhancement (from your screenshot):** **two-tone bar** + **inner tick** marking prior-week level or sub-target; implement if time allows after bars + AVG ship.
- **Volume + % IMP. (one sentence, multi-week / bars):** For each **completed ISO week W**, `total(W)` vs **average of the four ISO weeks immediately before W**: `((total(W) − mean(total(W₋₁)…total(W₋₄))) / mean(…)) × 100`; **incomplete current week** = **MTD** as a **partial bar** (lighter / hatched; user-confirmed).

- **Peak + % IMP. (multi-week / bars):** Same structure as volume **%** but `total(W)` replaced by **peak(W)** = that week’s **max daily peak**; compare to **mean of peak(W₋₁)…peak(W₋₄)**.

- **Overlay in bar mode:** Comparison is **built into** the bar + AVG line + optional inner marker—not a separate “last week line graph.”

---

**Plank (locked):** All **labels, tooltips, and Y-axis** for plank show **minutes** (convert from `plank_seconds` in code).

**Out of scope for this slice:** Arena, Profile, composite `pushups + plank/6 + run*10` for **this** chart (hybrid may remain on “This week’s arena” until a separate pass).

**Implementation target:** [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) — branch **week vs multi-week** renderer (`LineChart` vs `BarChart` + `ReferenceLine`); category + Volume/Peak + Raw/% toggles; dual `<Line />` + `ReferenceDot` for week mode; bar + AVG for long range; plank display minutes.

---

## 7. Resolved (user-confirmed)

- **Peak + Raw, weekly bars:** Bar = **max daily peak** in that ISO week.
- **Partial week:** Show **MTD** as partial / lighter bar.

When you’re ready for Arena, we’ll clone this structure for [`/arena`](src/app/arena/page.tsx) + `get_leaderboard`.
