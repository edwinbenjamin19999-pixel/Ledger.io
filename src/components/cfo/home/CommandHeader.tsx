import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Building2, Sparkles, ShieldCheck, Wrench, ClipboardCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  companyName?: string;
  period?: string;
  updatedAt?: string | Date | null;
  confidencePct?: number | null;
  criticalCount?: number;
  onRefresh?: () => void;
}

function relTime(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "nyss";
  if (s < 60) return `${s}s sedan`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m sedan`;
  const h = Math.floor(m / 60);
  return `${h}h sedan`;
}

export function CommandHeader({
  companyName = "Företaget",
  period,
  updatedAt,
  confidencePct,
  criticalCount = 0,
  onRefresh,
}: Props) {
  const navigate = useNavigate();
  const [, force] = useState(0);
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 5000);
    return () => clearInterval(i);
  }, []);

  const updated = updatedAt ? (typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt) : null;
  const periodLabel = period ?? new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" });

  return (
    <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-[0_4px_24px_-12px_rgba(0,82,255,0.15)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-[#0F1F3D] flex items-center justify-center shadow-[0_0_16px_rgba(0,82,255,0.35)] shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base md:text-lg font-bold tracking-tight truncate">{companyName}</h1>
              <span className="text-xs text-muted-foreground capitalize">· {periodLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              {updated && (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Uppdaterad {relTime(updated)}
                </span>
              )}
              {typeof confidencePct === "number" && (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-[#3b82f6]" />
                  AI-konfidens {Math.round(confidencePct)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onRefresh} title="Uppdatera">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            className="hidden md:inline-flex gap-1.5 bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            style={{ border: "1px solid rgba(0,0,0,0.15)", color: "#374151" }}
            onClick={() => navigate("/closing")}
          >
            <ClipboardCheck className="h-4 w-4" /> Bokslutskontroll
          </Button>
          <Button
            size="sm"
            className="hidden lg:inline-flex gap-1.5 bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            style={{ border: "1px solid rgba(0,0,0,0.15)", color: "#374151" }}
            onClick={() => navigate("/cfo/workspace")}
          >
            <Sparkles className="h-4 w-4" /> Granska åtgärder
          </Button>
          {criticalCount > 0 && (
            <Button
              size="sm"
              className="gap-1.5 relative text-white border-0 transition-colors"
              style={{ background: "#EF4444" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#DC2626"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#EF4444"; }}
              onClick={() => {
                const el = document.getElementById("cfo-priorities");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                  navigate("/cfo/workspace");
                }
              }}
            >
              <span className="absolute -inset-0.5 rounded-md bg-rose-500/40 blur-sm animate-pulse pointer-events-none -z-10" aria-hidden />
              <Wrench className="h-4 w-4" />
              Åtgärda kritiskt
              <Badge className="ml-1 bg-white/20 text-white border-0 h-5 px-1.5 hover:bg-white/20">{criticalCount}</Badge>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
