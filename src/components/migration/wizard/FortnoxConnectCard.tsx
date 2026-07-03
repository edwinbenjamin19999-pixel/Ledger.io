import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CheckCircle2, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  startFortnoxOAuth,
  getFortnoxConnection,
  disconnectFortnox,
  type FortnoxConnectionInfo,
} from "@/lib/fortnox/fortnoxAuth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string;
  onFetched?: (stats: Record<string, number>, jobId: string) => void;
}

interface FetchProgress {
  customers?: number;
  suppliers?: number;
  customerInvoices?: number;
  supplierInvoices?: number;
}

export const FortnoxConnectCard = ({ companyId, onFetched }: Props) => {
  const [conn, setConn] = useState<FortnoxConnectionInfo>({ connected: false });
  const [connecting, setConnecting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState<FetchProgress>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getFortnoxConnection(companyId)
      .then((c) => mounted && setConn(c))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [companyId]);

  // Auto-trigger fetch on mount if just-connected query param present
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("fortnox") === "connected" && conn.connected && !fetching) {
      url.searchParams.delete("fortnox");
      window.history.replaceState({}, "", url.toString());
      handleFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.connected]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const url = await startFortnoxOAuth(companyId);
      window.location.href = url;
    } catch (e: any) {
      const msg = e?.message || "Kunde inte starta anslutning";
      setError(msg);
      toast.error(msg);
      setConnecting(false);
    }
  };

  const handleFetch = async () => {
    setFetching(true);
    setProgress({});
    setError(null);

    // Poll job stats while running
    let pollTimer: any = null;
    let currentJobId: string | null = null;
    const startPolling = () => {
      pollTimer = setInterval(async () => {
        if (!currentJobId) return;
        const { data } = await supabase
          .from("migration_jobs")
          .select("stats, status")
          .eq("id", currentJobId)
          .maybeSingle();
        if (data?.stats) setProgress(data.stats as FetchProgress);
      }, 1500);
    };

    try {
      // Kick off and poll job created server-side. We don't get jobId until response,
      // so we estimate by listing latest job for company.
      const { data: latestJob } = await supabase
        .from("migration_jobs")
        .select("id")
        .eq("company_id", companyId)
        .eq("source_format", "fortnox_api")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const invokePromise = supabase.functions.invoke("fortnox-fetch", {
        body: { companyId },
      });

      // Start polling shortly after
      setTimeout(async () => {
        const { data: nj } = await supabase
          .from("migration_jobs")
          .select("id")
          .eq("company_id", companyId)
          .eq("source_format", "fortnox_api")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (nj && nj.id !== latestJob?.id) {
          currentJobId = nj.id;
          startPolling();
        }
      }, 800);

      const { data, error } = await invokePromise;
      if (pollTimer) clearInterval(pollTimer);

      if (error) {
        // Surface real edge function error body instead of generic
        // "Edge Function returned a non-2xx status code".
        let msg = error.message || "Hämtning misslyckades";
        try {
          const res: Response | undefined = (error as any).context;
          if (res?.clone) {
            const body = await res.clone().json().catch(() => null);
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      setProgress(data.stats || {});
      toast.success("Data hämtad från Fortnox");
      onFetched?.(data.stats || {}, data.jobId);
    } catch (e: any) {
      if (pollTimer) clearInterval(pollTimer);
      const msg = e?.message || "Hämtning misslyckades";
      setError(msg);
      toast.error(msg);
    } finally {
      setFetching(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFortnox(companyId);
      setConn({ connected: false });
      toast.success("Frånkopplad från Fortnox");
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte koppla från");
    }
  };

  // ----- UI -----

  if (conn.connected) {
    return (
      <div className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-[#0B4F6C]">Ansluten till Fortnox</p>
              {conn.fortnoxCompanyId && (
                <p className="text-[11px] text-[#64748B]">Bolag: {conn.fortnoxCompanyId}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-[11px] text-[#94A3B8] hover:text-[#0B4F6C] underline"
          >
            Koppla från
          </button>
        </div>

        {(fetching || Object.keys(progress).length > 0) && (
          <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[#0B4F6C]" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[#0B4F6C]">
                {fetching ? "Hämtar data från Fortnox" : "Hämtning klar"}
              </p>
            </div>
            <ProgressRow label="Kunder" count={progress.customers} active={fetching} />
            <ProgressRow label="Leverantörer" count={progress.suppliers} active={fetching} />
            <ProgressRow label="Kundfakturor" count={progress.customerInvoices} active={fetching} />
            <ProgressRow
              label="Leverantörsfakturor"
              count={progress.supplierInvoices}
              active={fetching}
            />
          </div>
        )}

        {!fetching && (
          <Button
            onClick={handleFetch}
            className="bg-[#0B4F6C] hover:bg-[#0B4F6C]/90 text-[#E6F4FA] rounded-[8px] h-[44px] px-5 text-[13px] font-medium"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {Object.keys(progress).length > 0 ? "Hämta igen" : "Hämta data nu"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] p-5 space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8]">
          Fortnox
        </p>
        <h3 className="text-base font-semibold text-[#0B4F6C] mt-1">
          Anslut ditt Fortnox-konto
        </h3>
        <p className="text-[12px] text-[#64748B] mt-1 leading-relaxed">
          Vi hämtar dina kunder, leverantörer och fakturor automatiskt. Du behöver inte
          exportera någon fil.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[8px] p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-900 leading-relaxed">{error}</p>
        </div>
      )}

      <Button
        onClick={handleConnect}
        disabled={connecting}
        className="bg-[#0B4F6C] hover:bg-[#0B4F6C]/90 text-[#E6F4FA] rounded-[8px] h-[44px] px-5 text-[13px] font-medium"
      >
        {connecting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        Anslut Fortnox
      </Button>

      <div className="flex items-center gap-1.5">
        <Lock className="h-3 w-3 text-[#94A3B8]" />
        <p className="text-[10px] text-[#94A3B8]">
          Ledger.io begär endast läsbehörighet. Vi kan aldrig ändra data i Fortnox.
        </p>
      </div>
    </div>
  );
};

const ProgressRow = ({
  label,
  count,
  active,
}: {
  label: string;
  count?: number;
  active: boolean;
}) => {
  const c = count ?? 0;
  const pct = Math.min(100, c > 0 ? Math.max(8, Math.log10(c + 1) * 35) : active ? 4 : 0);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-[#64748B]">{label}</span>
        <span className="font-medium text-[#0B4F6C]">
          {c > 0 ? `${c.toLocaleString("sv-SE")} hämtade` : active ? "Hämtar…" : "—"}
        </span>
      </div>
      <div className="h-[3px] bg-[#DBEAFE] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0B4F6C] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
