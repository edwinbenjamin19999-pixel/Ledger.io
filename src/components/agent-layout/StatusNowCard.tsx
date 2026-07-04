import { Loader2, AlertTriangle, Pause, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AgentStatusNow } from "./types";
import { formatRelative } from "./format";

interface Props {
  status: AgentStatusNow;
  onResume?: () => void;
}

export function StatusNowCard({ status, onResume }: Props) {
  const base =
    "rounded-2xl border bg-white dark:bg-slate-800/60 p-5 transition-shadow";

  if (status.state === "error") {
    return (
      <div className={`${base} border-rose-300/70`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-rose-50 p-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700">
              Fel
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {status.errorMessage ?? "Ett okänt fel inträffade."}
            </div>
            {(status.errorDetailsHref || status.onErrorDetails) && (
              status.errorDetailsHref ? (
                <a
                  href={status.errorDetailsHref}
                  className="mt-1 inline-block text-sm font-medium text-rose-700 underline-offset-2 hover:underline"
                >
                  Visa detaljer
                </a>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 text-rose-700"
                  onClick={status.onErrorDetails}
                >
                  Visa detaljer
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status.state === "paused") {
    return (
      <div className={`${base} border-amber-200/70`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-amber-50 p-2 text-amber-600">
            <Pause className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
              Pausad
            </div>
            <div className="mt-1 text-sm text-slate-900">
              Agenten är pausad — den arbetar inte just nu.
            </div>
          </div>
          {onResume && (
            <Button size="sm" onClick={onResume}>
              Återaktivera
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (status.state === "working") {
    return (
      <div className={`${base} border-slate-200/70`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-[#3b82f6]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Arbetar nu
            </div>
            <div className="mt-1 text-sm text-slate-900">
              {status.currentTask ?? "Bearbetar..."}
            </div>
            <div className="mt-3">
              <Progress
                value={
                  typeof status.progress === "number"
                    ? Math.max(0, Math.min(100, status.progress))
                    : undefined
                }
                className="h-1.5"
              />
            </div>
            {status.etaLabel && (
              <div className="mt-2 text-xs text-slate-500 tabular-nums">
                {status.etaLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className={`${base} border-slate-200/70`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Vilande
          </div>
          <div className="mt-1 text-sm text-slate-900">
            Inget pågående arbete just nu.
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {status.lastRunAt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Senaste körning: {formatRelative(status.lastRunAt)}
              </span>
            )}
            {status.nextRunAt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Nästa körning: {formatRelative(status.nextRunAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
