import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronDown, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CashPositionAccount } from "@/hooks/useLiveCashPosition";

interface Props {
  accounts: CashPositionAccount[];
  realtimeStatus: "live" | "reconnecting" | "offline";
  hasStaleData: boolean;
  newestSyncSeconds: number | null;
  companyId?: string | null;
  onSynced: () => void;
}

const formatRel = (sec: number | null): string => {
  if (sec === null) return "aldrig";
  if (sec < 60) return "just nu";
  if (sec < 3600) return `${Math.round(sec / 60)} min sedan`;
  if (sec < 86400) return `${Math.round(sec / 3600)} tim sedan`;
  return `${Math.round(sec / 86400)} dgr sedan`;
};

export function SyncTrustBar({
  accounts,
  realtimeStatus,
  hasStaleData,
  newestSyncSeconds,
  companyId,
  onSynced,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const connectedCount = accounts.filter((a) => a.connection_status !== "manual").length;
  const failedCount = accounts.filter((a) => a.connection_status === "stale").length;

  const overallStatus: "healthy" | "degraded" | "failed" =
    accounts.length === 0
      ? "failed"
      : failedCount === 0
        ? "healthy"
        : failedCount < accounts.length
          ? "degraded"
          : "failed";

  const StatusIcon = overallStatus === "healthy" ? CheckCircle2 : overallStatus === "degraded" ? AlertTriangle : XCircle;
  const statusColor =
    overallStatus === "healthy"
      ? "text-[#085041]"
      : overallStatus === "degraded"
        ? "text-[#7A5417]"
        : "text-[#7A1A1A]";

  const handleSync = async () => {
    if (!companyId || syncing) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("trigger-bank-sync", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      toast({ title: "Synkroniserat", description: "Bankdata uppdaterad." });
      onSynced();
    } catch (e) {
      toast({
        title: "Sync misslyckades",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
          onClick={() => setExpanded((v) => !v)}
        >
          <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusColor}`} />
          <span className="text-sm font-medium">
            {connectedCount} {connectedCount === 1 ? "konto" : "konton"} anslutna
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Senast synkad {formatRel(newestSyncSeconds)}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        <div className="flex items-center gap-2">
          <div
            className={`hidden sm:flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${
              realtimeStatus === "live"
                ? "text-[#085041] bg-[#E1F5EE]"
                : "text-muted-foreground bg-muted"
            }`}
            title={realtimeStatus === "live" ? "Live updates aktiva" : "Live updates pausade — använder polling"}
          >
            {realtimeStatus === "live" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {realtimeStatus === "live" ? "Live" : "Polling"}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleSync}
            disabled={syncing || !companyId}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            Synka nu
          </Button>
        </div>
      </div>

      {hasStaleData && (
        <div className="px-4 py-2 bg-[#FAEEDA] dark:bg-amber-950/20 border-t border-[#F0DDB7] dark:border-amber-900/40 text-xs text-[#7A5417] dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          Bankdata uppdaterades senast {formatRel(newestSyncSeconds)} — visar senast kända saldon.
        </div>
      )}

      {expanded && accounts.length > 0 && (
        <div className="border-t divide-y">
          {accounts.map((a) => (
            <div key={a.id} className="px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    a.connection_status === "live"
                      ? "bg-emerald-500"
                      : a.connection_status === "manual"
                        ? "bg-slate-400"
                        : "bg-amber-500"
                  }`}
                />
                <span className="font-medium truncate">{a.bank_name}</span>
                {a.connection_status === "manual" && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Manual</span>
                )}
              </div>
              <span className="text-muted-foreground tabular-nums">
                {a.connection_status === "manual" ? "—" : formatRel(a.freshness_seconds)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
