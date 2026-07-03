import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calculator, Users, BookOpen, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationChainStatusProps {
  companyId: string;
}

export const AutomationChainStatus = ({ companyId }: AutomationChainStatusProps) => {
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => { loadData(); }, [companyId]);

  const loadData = async () => {
    const [tasksRes, settingsRes] = await Promise.all([
      supabase.from("automation_tasks").select("task_type, status, created_at, approval_summary, completed_at")
        .eq("company_id", companyId).order("created_at", { ascending: false }).limit(10),
      supabase.from("automation_settings").select("*").eq("company_id", companyId).maybeSingle(),
    ]);
    setRecentTasks(tasksRes.data || []);
    setSettings(settingsRes.data);
  };

  const steps = [
    { type: "receipt", label: "Kvitto/AI-chatt", icon: FileText,
      status: "active" as const, detail: "AI bokför automatiskt",
      iconColor: "text-teal-300" },
    { type: "vat", label: "Momsberäkning", icon: Calculator,
      status: (settings?.vat_auto_prepare !== false ? "active" : "disabled") as "active" | "disabled",
      detail: settings?.vat_auto_prepare !== false ? "Uppdateras per verifikat" : "Manuell",
      iconColor: "text-blue-300" },
    { type: "agi", label: "AGI-deklaration", icon: Users,
      status: (settings?.agi_auto_prepare !== false ? "active" : "disabled") as "active" | "disabled",
      detail: settings?.agi_auto_prepare !== false ? (settings?.agi_auto_submit ? "Helautomatisk" : "Förbereds automatiskt") : "Manuell",
      iconColor: "text-emerald-300" },
    { type: "annual", label: "Bokslut", icon: BookOpen,
      status: (settings?.annual_report_auto_prepare !== false ? "active" : "disabled") as "active" | "disabled",
      detail: settings?.annual_report_auto_prepare !== false ? "Vid räkenskapsårets slut" : "Manuellt",
      iconColor: "text-amber-300" },
  ];

  return (
    <div className="bg-[#0B1F2E] rounded-3xl p-6 shadow-sm border border-white/[0.04] overflow-hidden relative">
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-[#0E2A3D]/40 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-2">
            <Zap className="w-5 h-5 text-teal-300" strokeWidth={1.75} />
          </div>
          <span className="text-white font-semibold text-[15px] tracking-[-0.01em]">Automatiseringskedja</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-emerald-300/80 text-xs font-medium">Aktiv</span>
        </div>
      </div>

      {/* Steps */}
      <div className="relative z-10">
        {/* Connecting line — thin, low contrast */}
        <div className="absolute top-1/2 left-[12.5%] right-[12.5%] h-px bg-white/15 -translate-y-1/2 hidden lg:block" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = step.status === "active";
            return (
              <div key={step.type} className="relative z-10">
                {/* Step number badge */}
                <div className="absolute -top-2 -left-2 z-20 bg-[#0B1F2E] text-white/60 border border-white/10 rounded-full w-6 h-6 text-xs font-medium flex items-center justify-center">
                  {i + 1}
                </div>

                <div className={cn(
                  "bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-[160ms] ease-out cursor-pointer",
                  "hover:bg-white/[0.06] hover:border-white/15"
                )}>
                  {/* Icon with status dot */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/10">
                      <Icon className={cn("w-7 h-7", step.iconColor)} strokeWidth={1.75} />
                    </div>
                    <div className={cn(
                      "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                      isActive ? "bg-emerald-400" : "bg-slate-500"
                    )} />
                  </div>

                  <p className="text-white font-medium text-sm tracking-[-0.01em]">{step.label}</p>
                  <p className="text-white/45 text-xs">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      {recentTasks.length > 0 && (
        <div className="relative z-10 mt-4 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
          <Activity className="w-4 h-4 text-white/40 shrink-0" />
          <span className="text-white/70 text-sm truncate flex-1">
            {recentTasks[0]?.approval_summary || recentTasks[0]?.task_type}
          </span>
          <span className={cn(
            "text-xs rounded-full px-2 py-0.5 font-medium shrink-0 ml-auto",
            recentTasks[0]?.status === "completed"
              ? "bg-[#E1F5EE] text-emerald-300"
              : "bg-white/[0.06] text-white/50"
          )}>
            {recentTasks[0]?.status === "completed" ? "Klar" : recentTasks[0]?.status}
          </span>
        </div>
      )}
    </div>
  );
};
