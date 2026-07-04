import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Undo2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";

interface ActionRow {
  id: string;
  action_type: string;
  status: string;
  title: string | null;
  financial_impact: number | null;
  executed_at: string | null;
  created_at: string;
  reverted_at: string | null;
}

interface Props { companyId: string | null; }

const labelOf: Record<string, string> = {
  create_accrual: "Skapade periodisering",
  send_reminder: "Skickade påminnelse",
  reclassify: "Omklassificerade",
  apply_deferral: "Tillämpade förskott",
  generate_report: "Genererade rapport",
};

export function ActionHistoryFeed({ companyId }: Props) {
  const [rows, setRows] = useState<ActionRow[]>([]);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const { data } = await supabase
        .from("ai_economist_actions")
        .select("id, action_type, status, title, financial_impact, executed_at, created_at, reverted_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);
      setRows((data || []) as ActionRow[]);
    };
    load();
    const ch = supabase
      .channel(`actions-feed-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_economist_actions", filter: `company_id=eq.${companyId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId]);

  const [reverting, setReverting] = useState<string | null>(null);
  const revert = async (id: string) => {
    setReverting(id);
    try {
      const { error } = await supabase.functions.invoke("revert-cfo-action", { body: { action_id: id } });
      if (error) throw error;
      toast.success("Åtgärd ångrad", { description: "Tidigare tillstånd återställt" });
    } catch (e) {
      toast.error("Kunde inte ångra", { description: (e as Error).message });
    } finally {
      setReverting(null);
    }
  };

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#DFE4EA] bg-[#FAFBFC] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-[14px] h-[14px] rounded-full bg-[#0040CC] flex items-center justify-center">
          <span className="w-[5px] h-[5px] rounded-full bg-[#E6F4FA]" />
        </span>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">AI-aktivitet</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-[#94A3B8] py-4 text-center">Inga åtgärder ännu</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const ageHrs = (Date.now() - new Date(r.created_at).getTime()) / 3600000;
            const canRevert = r.status === "executed" && ageHrs < 24 && !r.reverted_at;
            return (
              <div key={r.id} className="rounded-[10px] p-2.5 bg-white border-[0.5px] border-[#E2E8F0]">
                <div className="flex items-start gap-2">
                  <span className="w-[14px] h-[14px] mt-[2px] rounded-full bg-[#0040CC] flex items-center justify-center shrink-0">
                    <span className="w-[5px] h-[5px] rounded-full bg-[#E6F4FA]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#0F172A] truncate">
                      {labelOf[r.action_type] || r.action_type}
                    </p>
                    {r.title && <p className="text-[11px] text-[#475569] truncate">{r.title}</p>}
                    {r.financial_impact != null && (
                      <p className={`text-[12px] font-medium tabular-nums mt-0.5 ${r.financial_impact < 0 ? "text-[#791F1F]" : "text-[#0F6E56]"}`}>
                        {r.financial_impact < 0 ? "−" : "+"}
                        {Math.abs(r.financial_impact).toLocaleString("sv-SE")} kr
                      </p>
                    )}
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: sv })}
                      {r.reverted_at && " · ångrad"}
                    </p>
                  </div>
                  {canRevert && (
                    <button
                      onClick={() => revert(r.id)}
                      disabled={reverting === r.id}
                      className="text-[#94A3B8] hover:text-[#475569] p-1 disabled:opacity-50"
                      title="Ångra"
                    >
                      {reverting === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
