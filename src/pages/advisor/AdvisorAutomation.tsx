import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { Zap, CheckCircle2, AlertTriangle, Clock, ChevronRight, Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

type RuleTemplate = {
  template: string;
  name: string;
  description: string;
  defaultConfig: Record<string, unknown>;
  configFields: { key: string; label: string; type: "number" | "text"; suffix?: string }[];
};

/** Five predefined automation rule templates the bureau can toggle on/off. */
const RULE_TEMPLATES: RuleTemplate[] = [
  {
    template: "vat_reminder",
    name: "Påminn klient innan moms-deadline",
    description: "Skicka automatisk e-postpåminnelse X dagar innan momsdeklarationen ska lämnas.",
    defaultConfig: { days_before: 7, send_to_client: true },
    configFields: [{ key: "days_before", label: "Dagar innan deadline", type: "number", suffix: "dagar" }],
  },
  {
    template: "missing_receipts_alert",
    name: "Larma vid saknade verifikationer",
    description: "Notifiera ansvarig konsult när en klient har fler än X verifikationer utan bilaga > 30 dagar.",
    defaultConfig: { threshold: 10 },
    configFields: [{ key: "threshold", label: "Tröskel (antal)", type: "number", suffix: "st" }],
  },
  {
    template: "monthly_report_send",
    name: "Skicka månadsrapport automatiskt",
    description: "Generera och skicka månadsrapport till klient varje månad efter att perioden stängts.",
    defaultConfig: { day_of_month: 5 },
    configFields: [{ key: "day_of_month", label: "Skickas dag i månaden", type: "number", suffix: "" }],
  },
  {
    template: "bank_reconciliation_nudge",
    name: "Påminnelse om bankavstämning",
    description: "Påminn klienten om att granska transaktioner när bankavstämning inte gjorts på X dagar.",
    defaultConfig: { stale_days: 21 },
    configFields: [{ key: "stale_days", label: "Föråldrad efter", type: "number", suffix: "dagar" }],
  },
  {
    template: "anomaly_review_flag",
    name: "Auto-flagga ovanliga transaktioner",
    description: "Skapa internt granskningsärende när AI hittar transaktioner > 5× snittet i klientens portfölj.",
    defaultConfig: { multiplier: 5 },
    configFields: [{ key: "multiplier", label: "Multipel av snitt", type: "number", suffix: "×" }],
  },
];

const STATUS_META: Record<string, { dotClass: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { dotClass: "bg-[#1D9E75]", label: "Lyckad", icon: CheckCircle2 },
  failed: { dotClass: "bg-[#E24B4A]", label: "Misslyckad", icon: AlertTriangle },
  awaiting_approval: { dotClass: "bg-[#EF9F27]", label: "Väntar godkännande", icon: Clock },
  skipped: { dotClass: "bg-[#94A3B8]", label: "Hoppat över", icon: ChevronRight },
};

export default function AdvisorAutomation() {
  const { firmId } = useAdvisorContext();
  const qc = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ["bureau-automation-rules", firmId],
    enabled: !!firmId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bureau_automation_rules")
        .select("*")
        .eq("firm_id", firmId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: log = [] } = useQuery({
    queryKey: ["bureau-automation-log", firmId],
    enabled: !!firmId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bureau_automation_log")
        .select(`
          *,
          firm_clients:firm_client_id ( companies:company_id ( name ) )
        `)
        .eq("firm_id", firmId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsertRule = useMutation({
    mutationFn: async (vars: { template: string; name: string; description: string; enabled: boolean; config: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("bureau_automation_rules")
        .upsert(
          [{
            firm_id: firmId!,
            template: vars.template,
            name: vars.name,
            description: vars.description,
            enabled: vars.enabled,
            config: vars.config as any,
          }],
          { onConflict: "firm_id,template" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automationsregel sparad", {
        className: "!bg-[#F0FBF7] !border-[0.5px] !border-[#BBF7D0] !text-[#085041]",
      });
      qc.invalidateQueries({ queryKey: ["bureau-automation-rules", firmId] });
    },
    onError: (e: any) => toast.error("Fel: " + (e?.message ?? "okänt")),
  });

  const enableAllMutation = useMutation({
    mutationFn: async () => {
      const rows = RULE_TEMPLATES.map((tpl) => {
        const existing = ruleByTemplate.get(tpl.template);
        return {
          firm_id: firmId!,
          template: tpl.template,
          name: tpl.name,
          description: tpl.description,
          enabled: true,
          config: (existing?.config ?? tpl.defaultConfig) as any,
        };
      });
      const { error } = await supabase
        .from("bureau_automation_rules")
        .upsert(rows, { onConflict: "firm_id,template" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alla automationsregler aktiverade");
      qc.invalidateQueries({ queryKey: ["bureau-automation-rules", firmId] });
    },
    onError: (e: any) => toast.error("Kunde inte aktivera: " + (e?.message ?? "okänt")),
  });

  const ruleByTemplate = new Map(rules.map((r: any) => [r.template, r]));
  const allOff = RULE_TEMPLATES.every((tpl) => !ruleByTemplate.get(tpl.template)?.enabled);

  return (
    <div className="px-6 py-6 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[#0F172A] flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#1D4ED8]" /> Automation
        </h1>
        <p className="text-[12px] text-[#94A3B8] mt-0.5">
          Förkonfigurerade regler som körs automatiskt över hela klientportföljen.
        </p>
      </div>

      {/* Onboarding banner — visas när alla regler är OFF */}
      {allOff && (
        <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] p-[14px] mb-[16px] flex items-start gap-[10px]">
          <div className="relative w-[14px] h-[14px] rounded-full bg-[#1D4ED8] shrink-0 mt-0.5 flex items-center justify-center">
            <Sparkles className="h-2.5 w-2.5 text-white" />
            <span className="absolute -right-0.5 -bottom-0.5 w-[5px] h-[5px] rounded-full bg-[#1AB8B0] border border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#0C447C]">Automatiseringen är inte aktiverad</p>
            <p className="text-[11px] text-[#185FA5] mt-0.5">
              Aktivera reglerna nedan för att Bokfy ska arbeta autonomt åt dig — påminnelser, rapporter och varningar sköts automatiskt.
            </p>
          </div>
          <button
            onClick={() => enableAllMutation.mutate()}
            disabled={enableAllMutation.isPending}
            className="bg-[#1D4ED8] hover:bg-[#1074A0] disabled:opacity-60 text-[#E6F4FA] rounded-[8px] text-[11px] px-[12px] h-[30px] inline-flex items-center gap-1 shrink-0"
          >
            {enableAllMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Aktivera alla
          </button>
        </div>
      )}

      {/* Rule templates */}
      <div className="space-y-2">
        {RULE_TEMPLATES.map((tpl) => {
          const existing = ruleByTemplate.get(tpl.template);
          return (
            <RuleRow
              key={tpl.template}
              template={tpl}
              rule={existing}
              onSave={(enabled, config) =>
                upsertRule.mutateAsync({
                  template: tpl.template,
                  name: tpl.name,
                  description: tpl.description,
                  enabled,
                  config,
                })
              }
            />
          );
        })}
      </div>

      {/* Activity log */}
      <div className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] overflow-hidden">
        <div className="h-[1.5px] bg-[#1D4ED8]" />
        <div className="p-[14px]">
          <h2 className="text-[14px] font-medium text-[#0F172A] mb-1">Senaste aktivitet</h2>
          <p className="text-[11px] text-[#94A3B8] mb-3">De 50 senaste automation-körningarna</p>
          {log.length === 0 ? (
            <div className="text-[12px] text-[#94A3B8] py-6 text-center">
              {allOff
                ? "Aktivera reglerna ovan för att se aktivitet här."
                : "Automatiseringen är aktiv och kör schemalagt. Aktivitet visas här när den första körningen genomförs."}
            </div>
          ) : (
            <div className="space-y-1">
              {log.map((entry: any) => {
                const meta = STATUS_META[entry.status] ?? STATUS_META.skipped;
                const Icon = meta.icon;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-3 py-2 bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px]"
                  >
                    <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${meta.dotClass}`} />
                    <Icon className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-[#0F172A] truncate">
                          {entry.template}
                        </span>
                        {entry.firm_clients?.companies?.name && (
                          <span className="text-[11px] text-[#475569] truncate">
                            · {entry.firm_clients.companies.name}
                          </span>
                        )}
                      </div>
                      {(entry.result_summary || entry.error_message) && (
                        <div className="text-[11px] text-[#475569] truncate">
                          {entry.error_message ?? entry.result_summary}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-[#94A3B8] font-mono shrink-0">
                      {format(new Date(entry.created_at), "yyyy-MM-dd HH:mm", { locale: sv })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RuleRow({
  template,
  rule,
  onSave,
}: {
  template: RuleTemplate;
  rule: any;
  onSave: (enabled: boolean, config: Record<string, unknown>) => Promise<void> | void;
}) {
  const [enabled, setEnabled] = useState<boolean>(rule?.enabled ?? false);
  const [config, setConfig] = useState<Record<string, unknown>>(
    rule?.config ?? template.defaultConfig,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success">("idle");

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await onSave(enabled, config);
      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  };

  return (
    <div className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] overflow-hidden">
      <div className="h-[1.5px] bg-[#1D4ED8]" />
      <div className="p-[14px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-medium text-[#0F172A]">{template.name}</h3>
              {rule?.enabled && (
                <span className="bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5] rounded-full text-[9px] font-medium px-[8px] py-px">
                  AKTIV
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">{template.description}</p>

            {/* Config fields */}
            <div className="flex items-center gap-3 mt-2">
              {template.configFields.map((f) => (
                <div key={f.key} className="flex items-center gap-1.5">
                  <label className="text-[11px] text-[#475569]">{f.label}:</label>
                  <input
                    type={f.type}
                    value={String(config[f.key] ?? "")}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="w-[60px] h-[26px] px-2 text-[11px] border-[0.5px] border-[#E2E8F0] rounded-[6px] bg-white text-[#0F172A] focus:outline-none focus:border-[#1D4ED8]"
                  />
                  {f.suffix && <span className="text-[10px] text-[#94A3B8]">{f.suffix}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Toggle + save */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={`relative w-[36px] h-[20px] rounded-full transition-colors ${
                enabled ? "bg-[#1D4ED8]" : "bg-[#E2E8F0]"
              }`}
            >
              <span
                className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform ${
                  enabled ? "translate-x-[18px]" : "translate-x-[2px]"
                }`}
              />
            </button>
            <button
              onClick={handleSave}
              disabled={saveState !== "idle"}
              className={`rounded-[8px] text-[11px] font-medium px-[12px] h-[28px] flex items-center gap-1 transition-colors text-[#E6F4FA] ${
                saveState === "success"
                  ? "bg-[#1D9E75]"
                  : "bg-[#1D4ED8] hover:bg-[#1074A0] disabled:opacity-50"
              }`}
            >
              {saveState === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sparar...
                </>
              )}
              {saveState === "success" && (
                <>
                  <Check className="h-3 w-3" />
                  Sparat
                </>
              )}
              {saveState === "idle" && "Spara"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
