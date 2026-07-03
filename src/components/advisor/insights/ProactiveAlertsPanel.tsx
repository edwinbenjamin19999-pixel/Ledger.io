import { useEffect, useState } from "react";
import { useBureauAlerts, useTriggerProactiveAlerts, useUpdateAlertStatus, type BureauAlert } from "@/hooks/useBureauAlerts";
import { AlertTriangle, AlertCircle, CheckCircle, Info, X, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

const SEVERITY_META: Record<BureauAlert["severity"], {
  icon: React.ComponentType<{ className?: string }>;
  dotClass: string;
  badgeClass: string;
  label: string;
}> = {
  critical: {
    icon: AlertCircle,
    dotClass: "bg-[#E24B4A]",
    badgeClass: "bg-[#FEE2E2] text-[#7F1D1D] border-[#FCA5A5]",
    label: "KRITISKT",
  },
  warning: {
    icon: AlertTriangle,
    dotClass: "bg-[#EF9F27]",
    badgeClass: "bg-[#FEF3C7] text-[#78350F] border-[#FBBF24]",
    label: "VARNING",
  },
  info: {
    icon: Info,
    dotClass: "bg-[#0EA5E9]",
    badgeClass: "bg-[#DBEAFE] text-[#0C447C] border-[#93C5FD]",
    label: "INFO",
  },
};

export const ProactiveAlertsPanel = () => {
  const navigate = useNavigate();
  const { data: alerts = [], isLoading, isError, refetch, dataUpdatedAt } = useBureauAlerts();
  const trigger = useTriggerProactiveAlerts();
  const update = useUpdateAlertStatus();

  // 10s safety timeout for the load. If the query never resolves, surface
  // an explicit failure state instead of a perpetual spinner.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [isLoading]);

  const grouped = {
    critical: alerts.filter((a) => a.severity === "critical"),
    warning: alerts.filter((a) => a.severity === "warning"),
    info: alerts.filter((a) => a.severity === "info"),
  };

  const lastScanLabel = dataUpdatedAt
    ? format(new Date(dataUpdatedAt), "yyyy-MM-dd HH:mm")
    : "—";

  return (
    <div className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] overflow-hidden">
      <div className="h-[1.5px] bg-[#0B4F6C]" />
      <div className="p-[14px]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-[14px] font-medium text-[#0F172A]">Proaktiva varningar</h2>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              AI-skannar portföljen dagligen kl 07:00. {alerts.length} öppna varningar.
            </p>
          </div>
          <button
            onClick={() => trigger.mutate()}
            disabled={trigger.isPending}
            className="bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[11px] px-[12px] h-[28px] hover:bg-[#F8FAFB] flex items-center gap-1.5 disabled:opacity-50"
          >
            {trigger.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Skanna nu
          </button>
        </div>

        {isLoading && !timedOut ? (
          <div className="text-[11px] text-[#94A3B8] py-6 text-center flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Skannar portföljen…
          </div>
        ) : isError || timedOut ? (
          <div className="bg-[#FEF3C7] border-[0.5px] border-[#FBBF24] rounded-[10px] p-[12px] flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[#78350F] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[12px] text-[#78350F] font-medium">
                Kunde inte hämta AI-analys — försök igen
              </p>
              <button
                onClick={() => refetch()}
                className="mt-2 bg-[#78350F] text-white rounded-[6px] text-[11px] font-medium px-[10px] h-[26px]"
              >
                Försök igen
              </button>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-[#F2FBF7] border-[0.5px] border-[#A7E3C7] rounded-[12px] p-[12px]">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-[#1D9E75] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[12px] text-[#0F172A] font-medium">
                  Inga proaktiva varningar — portföljen ser bra ut.
                </p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">
                  Senast skannad: {lastScanLabel}
                </p>
              </div>
              <button
                onClick={() => trigger.mutate()}
                disabled={trigger.isPending}
                className="bg-white border-[0.5px] border-[#A7E3C7] text-[#1D9E75] rounded-[6px] text-[10px] font-medium px-[10px] h-[24px] disabled:opacity-50"
              >
                Skanna nu
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {(["critical", "warning", "info"] as const).map((sev) =>
              grouped[sev].length > 0 ? (
                <div key={sev}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`inline-block px-[6px] py-px rounded-full text-[9px] font-medium border-[0.5px] ${SEVERITY_META[sev].badgeClass}`}>
                      {SEVERITY_META[sev].label}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {grouped[sev].length} st
                    </span>
                  </div>
                  <div className="space-y-1">
                    {grouped[sev].map((alert) => {
                      const Icon = SEVERITY_META[sev].icon;
                      return (
                        <div
                          key={alert.id}
                          className="flex items-center gap-3 px-3 py-2 bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] hover:border-[#CBD5E1] transition-colors"
                        >
                          <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${SEVERITY_META[sev].dotClass}`} />
                          <Icon className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {alert.client_name && (
                                <button
                                  onClick={() => navigate(`/wl/app/clients/${alert.firm_client_id}`)}
                                  className="text-[12px] font-medium text-[#0F172A] hover:text-[#0B4F6C] truncate"
                                >
                                  {alert.client_name}
                                </button>
                              )}
                              <span className="text-[10px] text-[#94A3B8] font-mono">
                                {alert.code}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#475569] truncate">
                              {alert.message}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] mt-0.5">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: sv })}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {alert.action_url && (
                              <button
                                onClick={() => navigate(alert.action_url!)}
                                className="bg-[#0B4F6C] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[6px] text-[10px] font-medium px-[10px] h-[24px] flex items-center gap-1"
                              >
                                Åtgärda <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            )}
                            <button
                              onClick={() => update.mutate({ id: alert.id, status: "resolved" })}
                              title="Markera som löst"
                              className="text-[#94A3B8] hover:text-[#1D9E75] p-1"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => update.mutate({ id: alert.id, status: "dismissed" })}
                              title="Avfärda"
                              className="text-[#94A3B8] hover:text-[#475569] p-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
};
