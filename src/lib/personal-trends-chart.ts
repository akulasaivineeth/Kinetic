import type { WorkoutLog } from '@/types/database';
import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  subDays,
} from 'date-fns';

export type PersonalTrendCategory = 'pushups' | 'plank' | 'run' | 'squats' | 'overall';
export type TrendAgg = 'volume' | 'peak';
export type TrendMode = 'raw' | 'percent';

type DayAgg = { vol: number; peak: number; score: number };

export function isWeekLineMode(
  range: 'week' | 'month' | '3mo' | '6mo' | 'year' | 'custom',
  customFrom?: Date,
  customTo?: Date
): boolean {
  if (range === 'week') return true;
  if (range === 'custom' && customFrom && customTo) {
    const days =
      (startOfDay(customTo).getTime() - startOfDay(customFrom).getTime()) / 86400000;
    return days <= 7;
  }
  return false;
}

/** Month preset keeps weekly bars; longer presets use monthly buckets. Custom &gt; ~1 month → monthly. */
export function shouldUseMonthBars(
  range: 'week' | 'month' | '3mo' | '6mo' | 'year' | 'custom',
  customFrom?: Date,
  customTo?: Date
): boolean {
  if (range === 'week' || range === 'month') return false;
  if (range === 'custom' && customFrom && customTo) {
    const days =
      (startOfDay(customTo).getTime() - startOfDay(customFrom).getTime()) / 86400000;
    return days > 31;
  }
  return true;
}

/** Extra history for overlays / % baselines. */
export function getChartLogFetchRange(
  visibleFrom: Date,
  visibleTo: Date,
  lineMode: boolean,
  monthBuckets: boolean
): { from: Date; to: Date } {
  if (lineMode) {
    const wkStart = startOfWeek(visibleFrom, { weekStartsOn: 1 });
    const wkEnd = endOfWeek(visibleFrom, { weekStartsOn: 1 });
    return { from: subWeeks(wkStart, 2), to: wkEnd };
  }
  if (monthBuckets) {
    const m0 = startOfMonth(visibleFrom);
    return { from: subMonths(m0, 6), to: visibleTo };
  }
  const wkStart = startOfWeek(visibleFrom, { weekStartsOn: 1 });
  return { from: subWeeks(wkStart, 5), to: visibleTo };
}

function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function buildDayMap(
  logs: WorkoutLog[],
  category: PersonalTrendCategory,
  fromMs: number,
  toMs: number
): Map<string, DayAgg> {
  const map = new Map<string, DayAgg>();
  for (const log of logs) {
    const t = new Date(log.logged_at).getTime();
    if (t < fromMs || t > toMs) continue;
    const dk = format(new Date(log.logged_at), 'yyyy-MM-dd');
    const cur = map.get(dk) ?? { vol: 0, peak: 0, score: 0 };
    
    // Accumulate total score for the day regardless of category
    cur.score += log.session_score || 0;

    if (category === 'overall') {
      cur.vol += log.session_score || 0;
      cur.peak = Math.max(cur.peak, log.session_score || 0);
    } else if (category === 'pushups') {
      cur.vol += log.pushup_reps;
      cur.peak = Math.max(cur.peak, log.pushup_reps);
    } else if (category === 'plank') {
      cur.vol += log.plank_seconds;
      cur.peak = Math.max(cur.peak, log.plank_seconds);
    } else if (category === 'squats') {
      const reps = log.squat_reps || 0;
      cur.vol += reps;
      cur.peak = Math.max(cur.peak, reps);
    } else if (category === 'run') {
      const km = Number(log.run_distance) || 0;
      cur.vol += km;
      cur.peak = Math.max(cur.peak, km);
    }
    map.set(dk, cur);
  }
  return map;
}

function dayScore(map: Map<string, DayAgg>, dk: string): number {
  return map.get(dk)?.score ?? 0;
}

function dayRaw(map: Map<string, DayAgg>, dk: string, agg: TrendAgg): number {
  const d = map.get(dk);
  if (!d) return 0;
  return agg === 'volume' ? d.vol : d.peak;
}

function pctDiff(cur: number, base: number): number {
  if (base === 0) return cur > 0 ? 100 : 0;
  return ((cur - base) / base) * 100;
}

function plankScale(category: PersonalTrendCategory, mode: TrendMode): number {
  if (category !== 'plank' || mode !== 'raw') return 1;
  return 60;
}

export type WeekLinePoint = {
  /** XAxis tick: weekday */
  weekday: string;
  /** XAxis tick: calendar date */
  datePart: string;
  /** Tooltip / legend */
  tooltipLabel: string;
  sortKey: string;
  /** Raw mode: null = no workout that day (line gaps, not a flat zero runway). */
  total: number | null;
  overlay?: number | null;
  score?: number;
  overlayScore?: number;
  peakHighlight?: boolean;
};

/**
 * Mean day-to-day change across an ordered calendar series (e.g. Mon–Sun).
 * Null/undefined/NaN totals are treated as 0 so rest days still define the
 * calendar span: divisor is (n − 1), not “workout days only”.
 */
export function averageDailyDeltaOverCalendarSpan(
  points: ReadonlyArray<{ total: number | null | undefined }>
): number {
  const n = points.length;
  if (n < 2) return 0;
  const y = (t: number | null | undefined) =>
    typeof t === 'number' && !Number.isNaN(t) ? t : 0;
  return (y(points[n - 1]!.total) - y(points[0]!.total)) / (n - 1);
}

export function buildWeekLineChart(
  logs: WorkoutLog[],
  currentWeekStart: Date,
  currentWeekEnd: Date,
  category: PersonalTrendCategory,
  agg: TrendAgg,
  mode: TrendMode
): WeekLinePoint[] {
  const extFrom = addDays(currentWeekStart, -14);
  const extTo = currentWeekEnd;
  const map = buildDayMap(logs, category, extFrom.getTime(), extTo.getTime());
  const scale = plankScale(category, mode);

  const days = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  const points: WeekLinePoint[] = [];

  const showOverlay = !(agg === 'peak' && mode === 'raw');

  const now = startOfDay(new Date());

  for (const d of days) {
    const sk = dayKey(d);
    const prevSk = dayKey(subDays(d, 7));
    const curRaw = dayRaw(map, sk, agg);
    const prevRaw = dayRaw(map, prevSk, agg);

    const isPastOrToday = !isAfter(startOfDay(d), now);

    let total: number | null;
    if (mode === 'raw') {
      if (curRaw > 0) {
        total = curRaw / scale;
      } else {
        total = isPastOrToday ? 0 : null;
      }
    } else {
      total = pctDiff(curRaw, prevRaw);
    }

    let overlay: number | null | undefined;
    if (showOverlay) {
      if (mode === 'raw') {
        overlay = prevRaw === 0 ? null : prevRaw / scale;
      } else {
        const prev2Raw = dayRaw(map, dayKey(addDays(d, -14)), agg);
        overlay = pctDiff(prevRaw, prev2Raw);
      }
    }

    points.push({
      weekday: format(d, 'EEE'),
      datePart: format(d, 'MMM d'),
      tooltipLabel: `${format(d, 'EEE')} ${format(d, 'MMM d')}`,
      sortKey: sk,
      total,
      overlay,
      score: dayScore(map, sk),
      overlayScore: dayScore(map, prevSk),
    });
  }

  if (agg === 'peak' && mode === 'raw') {
    let maxI = -1;
    let maxV = -Infinity;
    points.forEach((p, i) => {
      const v = p.total;
      if (typeof v === 'number' && v > maxV) {
        maxV = v;
        maxI = i;
      }
    });
    if (maxI >= 0 && maxV > 0) {
      points[maxI] = { ...points[maxI], peakHighlight: true };
    }
  }

  return points;
}

export type WeekBarRow = {
  /** Single-line label (tooltips / fallback) */
  label: string;
  sortKey: string;
  total: number;
  isPartial: boolean;
  /** Two-line X-axis: top (e.g. range or month), bottom (e.g. year) */
  tickTop: string;
  tickBottom: string;
};

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function buildMultiWeekBars(
  logs: WorkoutLog[],
  rangeFrom: Date,
  rangeTo: Date,
  category: PersonalTrendCategory,
  agg: TrendAgg,
  mode: TrendMode,
  now: Date = new Date()
): { bars: WeekBarRow[]; avgLine: number | null } {
  const map = buildDayMap(
    logs,
    category,
    subWeeks(startOfWeek(rangeFrom, { weekStartsOn: 1 }), 5).getTime(),
    rangeTo.getTime()
  );
  const scale = plankScale(category, mode);

  const start = startOfWeek(rangeFrom, { weekStartsOn: 1 });
  const end = rangeTo;
  const bars: WeekBarRow[] = [];

  let wStart = start;
  while (!isAfter(wStart, end)) {
    const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
    const sliceEnd = minDate([wEnd, end, now]);
    const isPartial = isWithinInterval(startOfDay(now), {
      start: wStart,
      end: wEnd,
    });

    const days = eachDayOfInterval({ start: wStart, end: sliceEnd });
    let weekVol = 0;
    let weekPeakMax = 0;
    for (const d of days) {
      const sk = dayKey(d);
      const day = map.get(sk);
      if (day) {
        weekVol += day.vol;
        weekPeakMax = Math.max(weekPeakMax, day.peak);
      }
    }

    const rawVal = (agg === 'volume' ? weekVol : weekPeakMax) / scale;

    const sameMonth = format(wStart, 'yyyy-MM') === format(sliceEnd, 'yyyy-MM');
    const tickTop = sameMonth
      ? `${format(wStart, 'MMM d')}–${format(sliceEnd, 'd')}`
      : `${format(wStart, 'MMM d')} – ${format(sliceEnd, 'MMM d')}`;
    const tickBottom = format(wStart, 'yyyy');

    bars.push({
      label: `${format(wStart, 'MMM d')} – ${format(sliceEnd, 'MMM d')}`,
      sortKey: dayKey(wStart),
      total: rawVal,
      isPartial,
      tickTop,
      tickBottom,
    });

    wStart = addDays(wEnd, 1);
  }

  const rawTotals = bars.map((b) => b.total);

  if (mode === 'percent') {
    const pctBars: WeekBarRow[] = bars.map((b, i) => {
      const prev = rawTotals.slice(Math.max(0, i - 4), i);
      const base = mean(prev);
      return {
        ...b,
        total: pctDiff(b.total, base),
      };
    });
    const completed = pctBars.filter((b) => !b.isPartial);
    const last4 = completed.slice(-4).map((b) => b.total);
    const avgLine = last4.length ? mean(last4) : null;
    return { bars: pctBars, avgLine };
  }

  const completedRaw = bars.filter((b) => !b.isPartial);
  const last4raw = completedRaw.slice(-4).map((b) => b.total);
  const avgLine = last4raw.length ? mean(last4raw) : null;

  return { bars, avgLine };
}

export function buildMonthlyBars(
  logs: WorkoutLog[],
  rangeFrom: Date,
  rangeTo: Date,
  category: PersonalTrendCategory,
  agg: TrendAgg,
  mode: TrendMode,
  now: Date = new Date()
): { bars: WeekBarRow[]; avgLine: number | null } {
  const map = buildDayMap(
    logs,
    category,
    subMonths(startOfMonth(rangeFrom), 6).getTime(),
    rangeTo.getTime()
  );
  const scale = plankScale(category, mode);

  const months = eachMonthOfInterval({
    start: startOfMonth(rangeFrom),
    end: startOfMonth(rangeTo),
  });
  const bars: WeekBarRow[] = [];

  for (const monthStart of months) {
    const monthEnd = endOfMonth(monthStart);
    const sliceStart = maxDate([rangeFrom, monthStart]);
    const sliceEnd = minDate([rangeTo, monthEnd, now]);
    if (isAfter(sliceStart, sliceEnd)) continue;

    const isPartial = isWithinInterval(startOfDay(now), {
      start: monthStart,
      end: monthEnd,
    });

    const days = eachDayOfInterval({ start: sliceStart, end: sliceEnd });
    let monthVol = 0;
    let monthPeakMax = 0;
    for (const d of days) {
      const sk = dayKey(d);
      const day = map.get(sk);
      if (day) {
        monthVol += day.vol;
        monthPeakMax = Math.max(monthPeakMax, day.peak);
      }
    }

    const rawVal = (agg === 'volume' ? monthVol : monthPeakMax) / scale;
    const yk = format(monthStart, 'yyyy-MM');

    bars.push({
      label: format(monthStart, 'MMM yyyy'),
      sortKey: yk,
      total: rawVal,
      isPartial,
      tickTop: format(monthStart, 'MMM'),
      tickBottom: format(monthStart, 'yyyy'),
    });
  }

  const rawTotals = bars.map((b) => b.total);

  if (mode === 'percent') {
    const pctBars: WeekBarRow[] = bars.map((b, i) => {
      const prev = rawTotals.slice(Math.max(0, i - 4), i);
      const base = mean(prev);
      return {
        ...b,
        total: pctDiff(b.total, base),
      };
    });
    const completed = pctBars.filter((b) => !b.isPartial);
    const last4 = completed.slice(-4).map((b) => b.total);
    const avgLine = last4.length ? mean(last4) : null;
    return { bars: pctBars, avgLine };
  }

  const completedRaw = bars.filter((b) => !b.isPartial);
  const last4raw = completedRaw.slice(-4).map((b) => b.total);
  const avgLine = last4raw.length ? mean(last4raw) : null;

  return { bars, avgLine };
}
