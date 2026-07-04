import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

interface Props {
  companyId: string;
  className?: string;
}

interface FeedbackRow {
  was_correct: boolean | null;
  ai_tier: string | null;
  created_at: string;
}

interface Stats {
  accuracyPct: number;
  autoHandled: number;
  totalThisMonth: number;
  avgConfidencePct: number;
  trend: { day: string; accuracy: number }[];
}

const MIN_SAMPLES = 5; // dölj hellre än att visa permanent platshållartext

function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Lightweight AI accuracy tracker.
 * Pulls from ai_action_feedback to compute:
 *  - accuracy this month (was_correct=true / total feedback)
 *  - transactions handled automatically (tier=done) vs total
 *  - 14-day sparkline trend of accuracy
 */
export function AIAccuracyWidget({ companyId, className }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = startOfMonth();
      const [feedbackRes, bookingRes] = await Promise.all([
        supabase
          .from("ai_action_feedback" as never)
          .select("was_correct, ai_tier, created_at")
          .eq("company_id", companyId)
          .gte("created_at", since)
          .order("created_at", { ascending: true }),
        supabase
          .from("agent_bookings")
          .select("status, confidence, created_at")
          .eq("company_id", companyId)
          .gte("created_at", monthStart.toISOString()),
      ]);
      if (!active) return;
      const rows = ((feedbackRes.data as unknown as FeedbackRow[]) ?? []);
      const bookings = (bookingRes.data ?? []) as { status: string | null; confidence: number | null }[];

      const monthRows = rows.filter((r) => new Date(r.created_at) >= monthStart);
      const withFeedback = monthRows.filter((r) => r.was_correct !== null);
      const correct = withFeedback.filter((r) => r.was_correct === true).length;
      // Andel auto-bokförda används som proxy för precision om feedback saknas.
      const autoBooked = bookings.filter((b) => b.status === "auto_booked" || b.status === "booked").length;
      const accuracyPct = withFeedback.length > 0
        ? Math.round((correct / withFeedback.length) * 100)
        : bookings.length > 0
          ? Math.round((autoBooked / bookings.length) * 100)
          : 0;
      const autoHandled = monthRows.filter((r) => r.ai_tier === "done").length + autoBooked;
      const totalThisMonth = monthRows.length + bookings.length;
      const confidences = bookings
        .map((b) => Number(b.confidence ?? 0))
        .filter((v) => v > 0);
      const avgConfidencePct = confidences.length > 0
        ? Math.round((confidences.reduce((s, v) => s + v, 0) / confidences.length) * 100)
        : 0;

      // 14-day trend
      const buckets: Record<string, { correct: number; total: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        buckets[dayKey(d)] = { correct: 0, total: 0 };
      }
      rows.forEach((r) => {
        const k = dayKey(new Date(r.created_at));
        if (!buckets[k]) return;
        if (r.was_correct === null) return;
        buckets[k].total += 1;
        if (r.was_correct) buckets[k].correct += 1;
      });
      let last = accuracyPct;
      const trend = Object.entries(buckets).map(([day, b]) => {
        const v = b.total > 0 ? Math.round((b.correct / b.total) * 100) : last;
        last = v;
        return { day, accuracy: v };
      });

      setStats({ accuracyPct, autoHandled, totalThisMonth, avgConfidencePct, trend });
      setLoading(false);
    })();
    return () => { active = false; };
  }, [companyId]);

  if (loading) {
    return <div className={`rounded-2xl border border-slate-200 bg-white p-5 h-[120px] animate-pulse ${className ?? ""}`} />;
  }
  if (!stats) return null;

  // Dölj widgeten hellre än att visa permanent "samlar underlag"-text.
  if (stats.totalThisMonth < MIN_SAMPLES) return null;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#3b82f6]" />
        </div>
        <h3 className="text-[13px] font-semibold text-slate-900">AI-precision</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            {stats.accuracyPct > 0 && stats.avgConfidencePct === 0 ? "Träffsäkerhet i månad" : "Snittkonfidens"}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-0.5">
            {stats.avgConfidencePct > 0 ? stats.avgConfidencePct : stats.accuracyPct}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Autohanterade</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-0.5">
            {stats.autoHandled}<span className="text-[13px] text-slate-500"> av {stats.totalThisMonth}</span>
          </p>
        </div>
        <div className="h-[60px]">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-0.5">
            <TrendingUp className="w-3 h-3" /> 14 dagar
          </div>
          <ResponsiveContainer width="100%" height={44}>
            <LineChart data={stats.trend}>
              <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
