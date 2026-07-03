import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, CalendarClock, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateCFOInsights, type CFOInsight } from "@/lib/ai-cfo-insights";
import { generateDeadlines, parseCompanySettings } from "@/lib/tax/generateDeadlines";
import { differenceInDays } from "date-fns";

interface Props {
  companyId: string;
}

interface DoneItem {
  id: string;
  text: string;
  ts: Date;
}

interface AttentionItem {
  id: string;
  title: string;
  why: string;
  cta: string;
  route: string;
  severity: "critical" | "warning" | "info";
}

interface Upcoming {
  id: string;
  title: string;
  daysLeft: number;
  type: string;
}

function fmtRel(d: Date) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "nyss";
  if (m < 60) return `${m} min sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h sedan`;
  return `${Math.floor(h / 24)}d sedan`;
}

function severityBg(s: AttentionItem["severity"]) {
  if (s === "critical") return "bg-rose-50 border-rose-200 text-rose-900";
  if (s === "warning") return "bg-amber-50 border-amber-200 text-amber-900";
  return "bg-blue-50 border-blue-200 text-blue-900";
}

export function DailyBriefingPanel({ companyId }: Props) {
  const navigate = useNavigate();
  const [done, setDone] = useState<DoneItem[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [jeRes, invRes, insights, companyRes] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id, description, created_at, ai_confidence, status")
          .eq("company_id", companyId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("invoices")
          .select("id, invoice_number, customer_name, updated_at, status")
          .eq("company_id", companyId)
          .eq("status", "paid")
          .gte("updated_at", since)
          .order("updated_at", { ascending: false })
          .limit(10),
        generateCFOInsights(companyId).catch(() => [] as CFOInsight[]),
        supabase
          .from("companies")
          .select(
            "fiscal_year_start, fiscal_year_end, vat_period_type, company_type, registered_for_fskatt, num_employees, eu_vat_liable",
          )
          .eq("id", companyId)
          .maybeSingle(),
      ]);

      if (!active) return;

      // Section 1 — Done
      const doneItems: DoneItem[] = [];
      let autoBooked = 0;
      let needsReview = 0;
      (jeRes.data || []).forEach((je: any) => {
        const conf = typeof je.ai_confidence === "number" ? je.ai_confidence : null;
        if (conf !== null && conf >= 0.9) autoBooked += 1;
        else if (conf !== null && conf < 0.8) needsReview += 1;
      });
      const matched = (invRes.data || []).length;

      if (autoBooked > 0)
        doneItems.push({
          id: "booked",
          text: `Bokförde ${autoBooked} ${autoBooked === 1 ? "verifikat" : "verifikat"} automatiskt med hög konfidens`,
          ts: new Date(),
        });
      if (matched > 0)
        doneItems.push({
          id: "matched",
          text: `Matchade ${matched} ${matched === 1 ? "betalning" : "betalningar"} mot fakturor`,
          ts: new Date(),
        });
      const recentDescs = (jeRes.data || [])
        .filter((j: any) => (j.ai_confidence ?? 0) >= 0.9)
        .slice(0, 2);
      recentDescs.forEach((j: any) =>
        doneItems.push({
          id: `je-${j.id}`,
          text: `Kategoriserade "${(j.description || "transaktion").slice(0, 60)}"`,
          ts: new Date(j.created_at),
        }),
      );

      setDone(doneItems);

      // Section 2 — Attention (CFO actions + needsReview hint)
      const att: AttentionItem[] = (insights || [])
        .filter((i) => i.severity === "action")
        .slice(0, 5)
        .map((i) => ({
          id: i.id,
          title: i.title,
          why: i.reason ?? i.recommendation ?? "Underlag indikerar att en åtgärd behövs.",
          cta: i.ctaLabel ?? "Granska",
          route: i.ctaRoute ?? "/cfo",
          severity: "warning" as const,
        }));
      if (needsReview > 0) {
        att.unshift({
          id: "review-low-conf",
          title: `${needsReview} verifikat behöver din granskning`,
          why: "AI:n var inte säker nog för att bokföra automatiskt.",
          cta: "Granska",
          route: "/verifications",
          severity: "warning",
        });
      }
      setAttention(att);

      // Section 3 — Upcoming
      try {
        const settings = parseCompanySettings((companyRes.data as Record<string, unknown>) || {});
        const all = generateDeadlines(settings, new Date().getFullYear());
        const now = new Date();
        const items: Upcoming[] = all
          .filter((d) => d.dueDate >= now)
          .slice(0, 5)
          .map((d) => ({
            id: d.id,
            title: d.description || d.title,
            daysLeft: differenceInDays(d.dueDate, now),
            type: d.type,
          }));
        setUpcoming(items);
      } catch {
        setUpcoming([]);
      }

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Section 1 — Done */}
      <section className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <h3 className="text-[13px] font-semibold text-emerald-950">
            Det här har jag gjort sedan du loggade in sist
          </h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-emerald-100/60 rounded animate-pulse" />
            <div className="h-3 bg-emerald-100/60 rounded w-4/5 animate-pulse" />
          </div>
        ) : done.length === 0 ? (
          <p className="text-[13px] text-emerald-900/80 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 text-emerald-700 flex-shrink-0" />
            Allt är uppdaterat. Jag säger till om något behöver uppmärksamhet.
          </p>
        ) : (
          <ul className="space-y-2">
            {done.map((d) => (
              <li key={d.id} className="text-[13px] text-emerald-950 flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span className="flex-1">
                  {d.text}
                  <span className="text-emerald-700/60 ml-1.5 text-[11px]">{fmtRel(d.ts)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section 2 — Attention */}
      <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-700" />
          </div>
          <h3 className="text-[13px] font-semibold text-amber-950">Behöver din uppmärksamhet</h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-12 bg-amber-100/60 rounded animate-pulse" />
            <div className="h-12 bg-amber-100/60 rounded animate-pulse" />
          </div>
        ) : attention.length === 0 ? (
          <p className="text-[13px] text-amber-900/80 leading-relaxed">
            Inget kräver din uppmärksamhet just nu.
          </p>
        ) : (
          <ul className="space-y-2">
            {attention.map((a) => (
              <li
                key={a.id}
                className={`rounded-xl border px-3 py-2.5 ${severityBg(a.severity)}`}
              >
                <p className="text-[13px] font-medium leading-tight">{a.title}</p>
                <p className="text-[11.5px] opacity-80 mt-0.5 leading-snug">{a.why}</p>
                <button
                  onClick={() => navigate(a.route)}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold hover:underline"
                >
                  {a.cta} <ArrowRight className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section 3 — Upcoming */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-slate-700" />
          </div>
          <h3 className="text-[13px] font-semibold text-slate-900">På gång</h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse" />
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-[13px] text-slate-600">Inga inplanerade händelser den närmaste tiden.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-slate-800 truncate">{u.title}</span>
                <span
                  className={`text-[11px] tabular-nums whitespace-nowrap font-medium ${
                    u.daysLeft <= 5 ? "text-rose-700" : u.daysLeft <= 14 ? "text-amber-700" : "text-slate-500"
                  }`}
                >
                  {u.daysLeft === 0 ? "idag" : `om ${u.daysLeft} ${u.daysLeft === 1 ? "dag" : "dagar"}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
