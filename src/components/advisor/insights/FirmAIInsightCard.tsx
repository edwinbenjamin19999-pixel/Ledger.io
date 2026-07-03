import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  Eye,
  TrendingUp,
  ArrowRight,
  Wrench,
  UserPlus,
  Bell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useCreateTask } from "@/hooks/useFirmTasks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FirmAIInsight, InsightSeverity } from "@/hooks/useFirmAIInsights";

const SEVERITY_TONE: Record<InsightSeverity, {
  label: string;
  border: string;
  iconBg: string;
  iconText: string;
  badge: string;
  Icon: typeof AlertOctagon;
}> = {
  critical: {
    label: "Kritiskt",
    border: "rgb(254,205,211)",
    iconBg: "bg-[#FCE8E8]",
    iconText: "text-[#7A1A1A]",
    badge: "bg-[#FCE8E8] text-[#7A1A1A]",
    Icon: AlertOctagon,
  },
  watch: {
    label: "Bevaka",
    border: "rgb(253,230,138)",
    iconBg: "bg-[#FAEEDA]",
    iconText: "text-[#7A5417]",
    badge: "bg-[#FAEEDA] text-[#7A5417]",
    Icon: Eye,
  },
  opportunity: {
    label: "Möjlighet",
    border: "rgb(167,243,208)",
    iconBg: "bg-[#E1F5EE]",
    iconText: "text-[#085041]",
    badge: "bg-[#E1F5EE] text-[#085041]",
    Icon: TrendingUp,
  },
};

interface Props {
  insight: FirmAIInsight;
}

export const FirmAIInsightCard = ({ insight }: Props) => {
  const navigate = useNavigate();
  const { setActiveClient } = useAdvisorActiveClient();
  const { firmId } = useAdvisorContext();
  const createTask = useCreateTask(firmId);
  const [expanded, setExpanded] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const tone = SEVERITY_TONE[insight.severity];
  const Icon = tone.Icon;

  const openClient = (clientId: string, clientName: string, orgNumber: string) => {
    setActiveClient({ id: clientId, name: clientName, orgNumber });
    navigate(insight.fixRoute ?? "/dashboard");
  };

  const handleFixFirst = () => {
    const first = insight.affected[0];
    if (!first) return;
    openClient(first.id, first.name, first.orgNumber);
  };

  const handleAssignAll = async () => {
    if (!insight.taskTitle) return;
    setBusy(true);
    try {
      await Promise.all(
        insight.affected.map((c) =>
          createTask.mutateAsync({
            company_id: c.id,
            title: insight.taskTitle!,
            description: `AI-insikt: ${insight.title}\n${insight.description}`,
            task_type: insight.taskType ?? "other",
            priority: insight.severity === "critical" ? "urgent" : insight.severity === "watch" ? "high" : "medium",
          }),
        ),
      );
      toast.success(`${insight.affected.length} uppgifter skapade`);
      setAssignOpen(false);
    } catch (e) {
      toast.error("Kunde inte skapa uppgifter");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleNotifyAll = async () => {
    if (!insight.notifyMessage) return;
    setBusy(true);
    try {
      const rows = insight.affected.map((c) => ({
        company_id: c.id,
        notification_type: "ai_insight",
        severity: insight.severity === "critical" ? "high" : "medium",
        title: insight.title,
        message: insight.notifyMessage!,
        metadata: { insight_id: insight.id, source: "firm_ai_insights" },
      }));
      const { error } = await supabase.from("admin_notifications").insert(rows);
      if (error) throw error;
      toast.success(`${insight.affected.length} klienter notifierade`);
      setNotifyOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte skicka notifiering");
    } finally {
      setBusy(false);
    }
  };

  const visibleClients = expanded ? insight.affected : insight.affected.slice(0, 3);

  return (
    <>
      <article
        className="rounded-3xl bg-white p-5 transition-all hover:-translate-y-0.5"
        style={{
          border: `1px solid ${tone.border}`,
          boxShadow: "0 12px 32px rgba(15,23,42,0.05)",
        }}
      >
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-xl ${tone.iconBg} ${tone.iconText} flex items-center justify-center shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-md ${tone.badge}`}>
                  {tone.label}
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#94A3B8]">
                  {insight.category}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#0F172A] mt-1.5 leading-snug">
                {insight.title}
              </h3>
            </div>
          </div>
          <span className="text-2xl font-bold tabular-nums shrink-0 text-[#0F172A]">
            {insight.affected.length}
          </span>
        </header>

        <p className="text-sm text-[#64748B] leading-relaxed">{insight.description}</p>

        {/* Affected clients preview */}
        {insight.affected.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {visibleClients.map((c) => (
              <button
                key={c.id}
                onClick={() => openClient(c.id, c.name, c.orgNumber)}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-xl hover:bg-[#F8FAFC] transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#0F172A] truncate">{c.name}</div>
                  <div className="text-[10px] text-[#94A3B8]">{c.orgNumber}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
            {insight.affected.length > 3 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1 px-3 py-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Visa färre
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Visa {insight.affected.length - 3} till
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
          {insight.fixRoute && (
            <button
              onClick={handleFixFirst}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "hsl(var(--brand-primary))" }}
            >
              <Wrench className="h-3.5 w-3.5" />
              Åtgärda
            </button>
          )}
          {insight.taskTitle && (
            <button
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Tilldela
            </button>
          )}
          {insight.notifyMessage && (
            <button
              onClick={() => setNotifyOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              Notifiera
            </button>
          )}
        </div>
      </article>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa uppgifter</DialogTitle>
            <DialogDescription>
              Skapar "{insight.taskTitle}" för {insight.affected.length} klient
              {insight.affected.length === 1 ? "" : "er"}. Uppgifterna hamnar i workflow-vyn med prioritet baserad på allvarsgrad.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={busy}>
              Avbryt
            </Button>
            <Button onClick={handleAssignAll} disabled={busy}>
              {busy ? "Skapar…" : `Skapa ${insight.affected.length} uppgifter`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifiera klienter</DialogTitle>
            <DialogDescription>
              Skickar in-app notifiering till {insight.affected.length} klient
              {insight.affected.length === 1 ? "" : "er"}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-[#F8FAFC] p-3 text-sm text-[#0F172A] border border-[#E2E8F0]">
            {insight.notifyMessage}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyOpen(false)} disabled={busy}>
              Avbryt
            </Button>
            <Button onClick={handleNotifyAll} disabled={busy}>
              {busy ? "Skickar…" : "Skicka notifiering"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
