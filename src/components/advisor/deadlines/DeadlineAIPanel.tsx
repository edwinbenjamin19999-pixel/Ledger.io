import { Sparkles, AlertTriangle, BellRing, FileWarning, UserPlus, Eye } from "lucide-react";
import type { DeadlinePrediction } from "@/hooks/useDeadlinePredictions";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props { predictions: DeadlinePrediction[]; firmId: string | null; }

const ACTION_META: Record<DeadlinePrediction["suggestedAction"], { label: string; Icon: typeof BellRing }> = {
  send_reminder: { label: "Skicka påminnelse", Icon: BellRing },
  request_documents: { label: "Begär underlag", Icon: FileWarning },
  assign_task: { label: "Tilldela uppgift", Icon: UserPlus },
  review_now: { label: "Granska nu", Icon: Eye },
};

export const DeadlineAIPanel = ({ predictions, firmId }: Props) => {
  const { setActiveClient } = useAdvisorActiveClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const atRisk = predictions.filter((p) => p.riskScore >= 50).slice(0, 6);

  const handleAction = async (p: DeadlinePrediction) => {
    if (!user || !firmId) return;
    if (p.suggestedAction === "review_now") {
      setActiveClient({ id: p.deadline.client_id, name: p.deadline.client_name });
      navigate(p.deadline.kind === "vat" ? "/moms" : p.deadline.kind === "agi" ? "/agi" : "/dashboard");
      return;
    }
    if (p.suggestedAction === "assign_task") {
      navigate("/wl/app/workflow");
      return;
    }
    // send_reminder / request_documents → admin notification
    const { error } = await supabase.from("admin_notifications").insert({
      company_id: p.deadline.client_id,
      user_id: user.id,
      notification_type: p.suggestedAction === "send_reminder" ? "deadline_reminder" : "document_request",
      severity: "warning",
      title: `${ACTION_META[p.suggestedAction].label}: ${p.deadline.label}`,
      message: `${p.deadline.client_name} – ${p.reason}`,
      metadata: { deadline_kind: p.deadline.kind, due_date: p.deadline.due_date.toISOString() },
    });
    if (error) toast.error("Kunde inte skicka", { description: error.message });
    else toast.success(ACTION_META[p.suggestedAction].label + " skickad");
  };

  return (
    <div className="rounded-3xl p-6" style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 30px 80px rgba(15,23,42,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#94A3B8]">AI Risk-radar</p>
          <h3 className="text-base font-semibold text-[#0F172A] mt-0.5">Förutsedda missade deadlines</h3>
        </div>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--brand-primary) / 0.1)" }}>
          <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--brand-primary))" }} />
        </div>
      </div>

      {atRisk.length === 0 ? (
        <p className="text-sm text-[#64748B] py-6 text-center">Inga riskdeadlines just nu. ✨</p>
      ) : (
        <div className="space-y-2">
          {atRisk.map((p) => {
            const ActionIcon = ACTION_META[p.suggestedAction].Icon;
            return (
              <div key={`${p.deadline.client_id}-${p.deadline.kind}-${p.deadline.due_date.toISOString()}`} className="rounded-xl border border-[#F1F5F9] p-3 hover:border-[#E2E8F0] transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${p.riskScore >= 75 ? "text-[#7A1A1A]" : "text-[#7A5417]"}`} />
                      <span className="text-sm font-semibold text-[#0F172A] truncate">{p.deadline.client_name}</span>
                    </div>
                    <div className="text-xs text-[#64748B] truncate">{p.deadline.label} · {p.deadline.daysLeft} d kvar</div>
                    <div className="text-[11px] text-[#94A3B8] mt-1">{p.reason}</div>
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${p.riskScore >= 75 ? "bg-[#FCE8E8] text-[#7A1A1A]" : "bg-[#FAEEDA] text-[#7A5417]"}`}>
                    {p.riskScore}
                  </span>
                </div>
                <button
                  onClick={() => handleAction(p)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  style={{ background: "hsl(var(--brand-primary) / 0.08)", color: "hsl(var(--brand-primary))" }}
                >
                  <ActionIcon className="h-3.5 w-3.5" />
                  {ACTION_META[p.suggestedAction].label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
