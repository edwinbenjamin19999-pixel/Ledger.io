import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

interface ActivityRow {
  id: string;
  company_id: string;
  description: string;
  created_at: string;
  is_ai: boolean;
}

const initials = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const colorFromId = (id: string) => {
  const palette = ["#EFF6FF#0C447C", "#FCE8E8#7A1A1A", "#E1F5EE#085041", "#FAEEDA#7A5417", "#EEEDFE#26215C"];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % palette.length;
  const [bg, text] = palette[h].split("#").filter(Boolean);
  return { bg: `#${bg}`, text: `#${text}` };
};

const ago = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "nyss";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

/**
 * Right-side activity feed for the bureau dashboard.
 * Pulls latest journal entries across all bureau clients and labels AI-handled
 * ones (anything with an ai_confidence score).
 */
export const BureauActivityFeed = () => {
  const { clients } = useAdvisorContext();
  const [items, setItems] = useState<ActivityRow[]>([]);
  const companyIds = useMemo(() => clients.map((c) => c.id), [clients]);
  const nameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  useEffect(() => {
    if (companyIds.length === 0) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("id, company_id, description, created_at, ai_confidence")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!active) return;
      setItems(
        (data ?? []).map((r: any) => ({
          id: r.id,
          company_id: r.company_id,
          description: r.description ?? "Ny verifikation",
          created_at: r.created_at,
          is_ai: r.ai_confidence !== null && r.ai_confidence !== undefined,
        })),
      );
    })();
    return () => {
      active = false;
    };
  }, [companyIds.join(",")]);

  return (
    <aside
      className="bg-white rounded-[12px] overflow-hidden h-fit"
      style={{ border: "0.5px solid #E2E8F0" }}
    >
      <header className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: "0.5px solid #F1F5F9" }}>
        <span className="text-[12px] font-medium text-[#0F172A]">Aktivitetsflöde</span>
        <span className="text-[10px] text-[#94A3B8]">Alla klienter</span>
      </header>
      <ul className="max-h-[640px] overflow-y-auto">
        {items.length === 0 && (
          <li className="px-3.5 py-6 text-center text-[11px] text-[#94A3B8]">Ingen aktivitet ännu.</li>
        )}
        {items.map((it) => {
          const name = nameById.get(it.company_id) ?? "Okänd";
          const c = colorFromId(it.company_id);
          return (
            <li
              key={it.id}
              className="flex items-center gap-2.5 px-3.5 py-2.5"
              style={{ borderBottom: "0.5px solid #F1F5F9", minHeight: 44 }}
            >
              {it.is_ai && <Sparkles className="h-3 w-3 text-[#534AB7]" />}
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: c.bg, color: c.text }}
              >
                {initials(name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#475569] truncate">
                  <span className="font-medium text-[#0F172A]">{name}</span> — {it.description}
                </div>
              </div>
              <span className="text-[10px] text-[#94A3B8] flex-shrink-0">{ago(it.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
