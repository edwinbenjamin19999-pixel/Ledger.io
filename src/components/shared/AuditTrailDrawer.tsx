import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, User, Sparkles, FileEdit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface AuditEntry {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
  user_id: string;
  user_name?: string;
}

interface Props {
  journalEntryId: string | null;
}

/** Compact timeline of changes for a single voucher. */
export const AuditTrailDrawer = ({ journalEntryId }: Props) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!journalEntryId) { setEntries([]); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, description, created_at, user_id")
        .eq("entity_type", "journal_entry")
        .eq("entity_id", journalEntryId)
        .order("created_at", { ascending: false })
        .limit(20);

      const list = (data as AuditEntry[]) || [];
      const ids = Array.from(new Set(list.map(e => e.user_id).filter(Boolean)));
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const map = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || p.email || "Användare"]));
        list.forEach(e => { e.user_name = map[e.user_id]; });
      }
      setEntries(list);
      setLoading(false);
    })();
  }, [journalEntryId]);

  if (!journalEntryId) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <History className="w-4 h-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-700">Ändringshistorik</h4>
      </div>
      <div className="p-4">
        {loading && <p className="text-xs text-slate-400">Hämtar historik…</p>}
        {!loading && entries.length === 0 && (
          <p className="text-xs text-slate-400 italic">Inga registrerade ändringar för denna verifikation.</p>
        )}
        {!loading && entries.length > 0 && (
          <ol className="relative border-l border-slate-200 ml-2 space-y-3">
            {entries.map(e => {
              const isAi = e.action.includes("ai") || e.action.includes("learn");
              const Icon = isAi ? Sparkles : e.action.includes("edit") ? FileEdit : User;
              return (
                <li key={e.id} className="ml-4 relative">
                  <span className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full ring-4 ${isAi ? "bg-[#3b82f6] ring-cyan-100" : "bg-slate-400 ring-slate-100"}`} />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700 inline-flex items-center gap-1.5">
                      <Icon className="w-3 h-3" />
                      {e.description || e.action}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: sv })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {e.user_name ? `Ändrad av ${e.user_name}` : "Systemändring"}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};
