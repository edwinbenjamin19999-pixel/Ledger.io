import { useEffect, useState } from "react";
import { Hand, Handshake, Bot, User, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { AutomationMode, PersonaMode } from "@/hooks/useAIEconomistSettings";

interface Props {
  automationMode: AutomationMode;
  personaMode: PersonaMode;
  pendingCount: number;
  readyCount: number;
  threshold: number;
  companyId: string | null;
}

export function ModeBanner({ automationMode, personaMode, pendingCount, readyCount, threshold, companyId }: Props) {
  const [autoToday, setAutoToday] = useState(0);

  useEffect(() => {
    if (!companyId || automationMode !== "autonomous") return;
    (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_economist_actions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("automation_mode", "autonomous")
        .gte("executed_at", since);
      setAutoToday(count || 0);
    })();
  }, [companyId, automationMode, readyCount]);

  const config = {
    manual: {
      Icon: Hand,
      label: "Manuellt läge",
      message: pendingCount > 0
        ? `Du beslutar — ${pendingCount} förslag väntar på din granskning.`
        : "Du beslutar — AI föreslår, du klickar Granska & godkänn.",
      ring: "border-amber-300/60 dark:border-[#F0DDB7] bg-amber-50/60 dark:bg-[#FAEEDA]",
      iconWrap: "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-200",
    },
    assisted: {
      Icon: Handshake,
      label: "Assisterat läge",
      message: readyCount > 0
        ? `Ett klick utför — ${readyCount} åtgärder redo att fixas automatiskt.`
        : "Ett klick utför — AI förbereder, du bekräftar med ett klick.",
      ring: "bg-[#EFF6FF] border-[#B5D4F4]",
      iconWrap: "bg-white border border-[#B5D4F4] text-[#0C447C]",
    },
    autonomous: {
      Icon: Bot,
      label: "Autonomt läge",
      message: `AI utför säkra åtgärder · ${autoToday} auto-körda senaste 24h · tröskel ${Math.round(threshold * 100)}%.`,
      ring: "border-purple-300/60 dark:border-[#E2E8F0] bg-purple-50/60 dark:bg-[#F1F5F9]",
      iconWrap: "bg-[#F1F5F9] text-purple-700 dark:text-purple-200",
    },
  }[automationMode];

  const { Icon } = config;
  const PersonaIcon = personaMode === "accountant" ? Briefcase : User;
  const personaLabel = personaMode === "accountant" ? "Vy: Redovisare" : "Vy: Företagare";

  return (
    <div className={cn(
      "rounded-[12px] border-[0.5px] px-[14px] py-[10px] flex items-center gap-3 transition-all",
      config.ring
    )}>
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", config.iconWrap)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C]">
          {config.label}
        </div>
        <div className="text-[12px] text-[#185FA5] leading-snug">
          {config.message}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E2E8F0] text-[11px] text-[#475569] shrink-0">
        <PersonaIcon className="h-3 w-3" />
        {personaLabel}
      </div>
    </div>
  );
}
