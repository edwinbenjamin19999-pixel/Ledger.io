import { Sparkles, X } from "lucide-react";
import type { AutoTask } from "@/services/taskGenerator";

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: AutoTask[];
  onRegenerate?: () => void;
}

function estimateHours(tasks: AutoTask[]): number {
  // Rough heuristic: critical=1.5h, high=1h, medium=0.5h
  const w = { critical: 1.5, high: 1, medium: 0.5 } as const;
  return Math.round(tasks.reduce((s, t) => s + w[t.priority], 0) * 10) / 10;
}

export const AIWorkflowAnalysisPanel = ({
  open,
  onClose,
  tasks,
  onRegenerate,
}: Props) => {
  if (!open) return null;

  const clients = new Set(tasks.map((t) => t.client_id));
  const critical = tasks.filter((t) => t.priority === "critical");
  const topClient =
    critical.length > 0
      ? critical[0].client_name
      : tasks[0]?.client_name ?? null;
  const vatSoon = tasks.find((t) => t.kind === "vat_due_soon");
  const hours = estimateHours(tasks);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[360px] p-4">
      <div className="rounded-[12px] bg-[#0B1929] p-[16px] shadow-2xl max-w-[320px] ml-auto">
        <div className="flex items-start justify-between mb-[12px]">
          <div className="flex items-center gap-[8px]">
            <div className="h-[24px] w-[24px] rounded-[6px] bg-white/10 flex items-center justify-center">
              <Sparkles className="h-[12px] w-[12px] text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
              AI Workflow-analys
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white/80"
          >
            <X className="h-[14px] w-[14px]" />
          </button>
        </div>

        <div className="space-y-[10px] text-[12px] text-white/80 leading-relaxed">
          <p>
            Denna vecka: <span className="text-white font-semibold">{tasks.length}</span>{" "}
            uppgifter för{" "}
            <span className="text-white font-semibold">{clients.size}</span>{" "}
            {clients.size === 1 ? "klient" : "klienter"}.
          </p>

          {vatSoon ? (
            <p>
              Prioritera{" "}
              <span className="text-white font-semibold">
                {vatSoon.client_name}
              </span>{" "}
              — moms förfaller snart.
            </p>
          ) : topClient ? (
            <p>
              Prioritera{" "}
              <span className="text-white font-semibold">{topClient}</span> —{" "}
              {critical.length > 0
                ? "kritisk uppgift väntar."
                : "äldsta öppna uppgiften."}
            </p>
          ) : (
            <p>Inga akuta prioriteringar just nu.</p>
          )}

          <p>
            Estimerad tid:{" "}
            <span className="text-white font-semibold">~{hours} timmar</span>.
          </p>
        </div>

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="mt-[16px] text-[11px] text-[#3b82f6] hover:text-[#3b82f6] font-medium"
          >
            Generera ny analys →
          </button>
        )}
      </div>
    </div>
  );
};
