// Pure deterministic cashflow projection engine.
// Shared between edge functions and frontend simulation preview.
// No I/O — only math. Same input → same output.

export interface CashEvent {
  date: string; // YYYY-MM-DD
  amount: number; // positive = inflow, negative = outflow
  source_type: "bank" | "invoice_ar" | "invoice_ap" | "recurring" | "manual" | "scenario";
  source_ref_id?: string;
  confidence?: number; // 0-1
  label?: string;
}

export interface DailyPoint {
  date: string;
  opening_balance: number;
  expected_inflows: number;
  expected_outflows: number;
  net_change: number;
  closing_balance: number;
  confidence_score: number;
  risk_level: "normal" | "warning" | "critical";
  events: CashEvent[];
}

export interface ForecastResult {
  baseline_balance: number;
  daily_points: DailyPoint[];
  lowest_cash_point: number;
  lowest_cash_date: string;
  runway_days: number | null;
}

export interface ForecastInput {
  start_balance: number;
  start_date: string; // YYYY-MM-DD
  horizon_days: number;
  events: CashEvent[];
  burn_rate_daily?: number; // for runway when no scheduled outflows extend horizon
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function classifyRisk(closing: number, opening: number): "normal" | "warning" | "critical" {
  if (closing < 0) return "critical";
  if (closing < Math.abs(opening) * 0.1 && closing < 50_000) return "warning";
  return "normal";
}

/**
 * Deterministic projection. Builds a day-by-day balance trajectory.
 * Lowest cash point = minimum closing_balance across horizon.
 * Runway = days until closing_balance crosses zero (or null if never).
 */
export function projectCashflow(input: ForecastInput): ForecastResult {
  const { start_balance, start_date, horizon_days, events } = input;

  // Bucket events by date
  const byDate = new Map<string, CashEvent[]>();
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  const points: DailyPoint[] = [];
  let balance = start_balance;
  let lowest = start_balance;
  let lowestDate = start_date;
  let runway: number | null = null;

  for (let i = 0; i < horizon_days; i++) {
    const date = addDays(start_date, i);
    const dayEvents = byDate.get(date) ?? [];
    const inflows = dayEvents.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const outflows = dayEvents.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
    const net = inflows - outflows;
    const opening = balance;
    balance = balance + net;

    // Confidence = avg of event confidences, default 0.8 if no events
    const confs = dayEvents.map((e) => e.confidence ?? 0.85);
    const dayConf = confs.length ? confs.reduce((s, c) => s + c, 0) / confs.length : 0.85;

    const point: DailyPoint = {
      date,
      opening_balance: opening,
      expected_inflows: inflows,
      expected_outflows: outflows,
      net_change: net,
      closing_balance: balance,
      confidence_score: dayConf,
      risk_level: classifyRisk(balance, opening),
      events: dayEvents,
    };
    points.push(point);

    if (balance < lowest) {
      lowest = balance;
      lowestDate = date;
    }
    if (runway === null && balance <= 0) {
      runway = i;
    }
  }

  // If never crossed zero but burn rate provided, estimate runway from final balance
  if (runway === null && input.burn_rate_daily && input.burn_rate_daily > 0) {
    const projectedRunway = Math.round(balance / input.burn_rate_daily);
    runway = horizon_days + Math.max(0, projectedRunway);
  }

  return {
    baseline_balance: start_balance,
    daily_points: points,
    lowest_cash_point: lowest,
    lowest_cash_date: lowestDate,
    runway_days: runway,
  };
}

/**
 * Simple stable hash for input dedup (snapshot caching).
 * Not cryptographic — just identifies same logical input.
 */
export function hashForecastInput(input: ForecastInput): string {
  const normalized = {
    sb: Math.round(input.start_balance),
    sd: input.start_date,
    h: input.horizon_days,
    e: input.events.map((e) => `${e.date}:${Math.round(e.amount)}:${e.source_type}`).sort(),
  };
  const str = JSON.stringify(normalized);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(h).toString(36)}`;
}
