import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface Props {
  companyId: string | null;
}

interface Tick {
  id: string;
  text: string;
  ts: string;
  status: string;
}

const labelFor: Record<string, string> = {
  send_reminder: "Skickar påminnelse",
  reclassify: "Omklassificerar",
  apply_deferral: "Tillämpar förskott",
  create_accrual: "Skapar periodisering",
  generate_report: "Genererar rapport",
};

export function LiveActivityTicker({ companyId }: Props) {
  const [ticks, setTicks] = useState<Tick[]>([]);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const { data } = await supabase
        .from("ai_economist_actions")
        .select("id, action_type, status, title, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5);
      setTicks((data || []).map((r: any) => ({
        id: r.id,
        text: `${labelFor[r.action_type] || r.action_type}${r.title ? ` — ${r.title}` : ""}`,
        ts: r.created_at,
        status: r.status,
      })));
    };
    load();
    const ch = supabase
      .channel(`ai-ticker-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_economist_actions", filter: `company_id=eq.${companyId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId]);

  // Filter consecutive duplicates and collapse repeats into a count
  const deduped: (Tick & { count: number })[] = [];
  for (const t of ticks) {
    const last = deduped[deduped.length - 1];
    if (last && last.text === t.text && last.status === t.status) {
      last.count += 1;
    } else {
      deduped.push({ ...t, count: 1 });
    }
  }

  if (deduped.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-4 flex items-center justify-center gap-2 text-sm text-white/30">
        Ingen aktivitet de senaste 24 timmarna
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-2.5 flex items-center gap-3 overflow-hidden">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]"></span>
      </span>
      <Activity className="h-3.5 w-3.5 text-[#3b82f6] dark:text-[#1E3A5F] shrink-0" />
      <div className="flex gap-6 overflow-x-auto scrollbar-none text-xs">
        {deduped.map((t) => (
          <div key={t.id} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={t.status === "executed" ? "text-[#085041] dark:text-[#1D9E75]" : t.status === "failed" ? "text-[#7A1A1A] dark:text-[#C73838]" : "text-slate-700 dark:text-white/80"}>
              {t.text}{t.count > 1 ? ` (×${t.count})` : ""}
            </span>
            <span className="text-muted-foreground/70">· {formatDistanceToNow(new Date(t.ts), { addSuffix: true, locale: sv })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
