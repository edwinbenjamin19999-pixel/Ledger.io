import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, MessageSquare } from "lucide-react";
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
  const [stats, setStats] = useState({ autoBooked: 0, needsReview: 0, matched: 0 });
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
      setStats({ autoBooked, needsReview, matched });

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

  // Automationsgrad = andel auto-bokförda av det AI:n rört senaste dygnet.
  const totalTouched = stats.autoBooked + stats.needsReview;
  const automationPct = totalTouched > 0 ? Math.round((stats.autoBooked / totalTouched) * 100) : 100;
  const openCount = attention.length;

  // Två narrativstycken byggda av samma data som de gamla sektionerna.
  const doneLine =
    done.length === 0
      ? "Allt är uppdaterat sedan du loggade in sist — inget nytt att bokföra."
      : `Klart sedan sist. ${done
          .slice(0, 3)
          .map((d) => d.text)
          .join(". ")}.`;
  const attentionLine =
    openCount === 0
      ? "Inget kräver din uppmärksamhet just nu."
      : `Behöver dig: ${attention[0].title}${openCount > 1 ? ` — och ${openCount - 1} till.` : "."}`;

  return (
    <div className="rounded-xl border border-[#DBE4FA] bg-gradient-to-b from-[#F4F7FE] to-[#FAFBFF] p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#0052FF] to-[#4D7CFF] text-white">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold text-[#0F172A]">AI Ekonom</div>
          <div className="text-[11px] font-mono text-[#4D7CFF]">Daglig briefing · idag</div>
        </div>
      </div>

      {/* Narrativ */}
      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-3.5 w-full animate-pulse rounded bg-[#E4EAF7]" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-[#E4EAF7]" />
        </div>
      ) : (
        <div className="mt-4 space-y-2.5 text-[13.5px] leading-[1.6] text-[#334155]">
          <p>{doneLine}</p>
          <p>{attentionLine}</p>
        </div>
      )}

      {/* Automationsgrad */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-[#475569]">
          <span>Automationsgrad senaste dygnet</span>
          <span className="font-mono tabular-nums text-[#0052FF]">{automationPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E4EAF7]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] transition-all"
            style={{ width: `${automationPct}%` }}
          />
        </div>
      </div>

      {/* CTA-rad */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => navigate("/verifications")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0052FF] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0040CC]"
        >
          {openCount > 0 ? `Öppna ${openCount} ${openCount === 1 ? "ärende" : "ärenden"}` : "Öppna granskningskö"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => navigate("/ai-ekonom")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[#475569] transition-colors hover:bg-[#E7EDFB]"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Fråga AI Ekonom
        </button>
      </div>
    </div>
  );
}
