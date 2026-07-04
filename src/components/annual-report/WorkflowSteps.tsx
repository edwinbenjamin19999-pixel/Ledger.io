import { ArrowRight, Check, Clock, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type StepStatus = "todo" | "in_progress" | "awaiting" | "complete" | "locked";

export interface WorkflowStep {
  id: string;
  title: string;
  subtitle: string;
  status: StepStatus;
  /** Inline substeps shown only on active step */
  substeps?: Array<{ label: string; done: boolean }>;
  lockedReason?: string;
  onAction?: () => void;
}

const STATUS_TEXT: Record<StepStatus, string> = {
  todo: "Starta →",
  in_progress: "Fortsätt →",
  awaiting: "Inväntar svar",
  complete: "Klart",
  locked: "Låst",
};

export function WorkflowSteps({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-[#0F172A]">Arbetsflöde</h2>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i + 1} />
        ))}
      </div>
    </div>
  );
}

function StepCard({ step, index }: { step: WorkflowStep; index: number }) {
  const isLocked = step.status === "locked";

  const circleClass =
    step.status === "complete" ? "bg-[#1D9E75] text-white" :
    step.status === "in_progress" ? "bg-[#0040CC] text-white" :
    step.status === "awaiting" ? "bg-[#EF9F27] text-white" :
    "bg-[#F1F5F9] text-[#94A3B8]";

  const card = (
    <div
      className={`bg-white rounded-[12px] p-[14px] flex items-start gap-3 transition-all ${isLocked ? "opacity-50" : ""}`}
      style={{ border: "0.5px solid #E2E8F0" }}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${circleClass}`}>
        {step.status === "complete" ? <Check className="w-4 h-4" /> :
         isLocked ? <Lock className="w-3.5 h-3.5" /> :
         index}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] truncate">{step.title}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{step.subtitle}</p>
          </div>
          <StepBadge status={step.status} onAction={step.onAction} />
        </div>

        {step.substeps && step.substeps.length > 0 && step.status === "in_progress" && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-[#64748B]">
            {step.substeps.map((s, i) => (
              <span key={i} className="flex items-center gap-1">
                {s.done ? <Check className="w-3 h-3 text-[#1D9E75]" /> : <span className="w-3 h-3 rounded-full border border-[#CBD5E1]" />}
                <span className={s.done ? "text-[#0F172A]" : ""}>{s.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isLocked && step.lockedReason) {
    return (
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild><div>{card}</div></TooltipTrigger>
          <TooltipContent>{step.lockedReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return card;
}

function StepBadge({ status, onAction }: { status: StepStatus; onAction?: () => void }) {
  if (status === "complete") {
    return <span className="text-[11px] text-[#0F5132] bg-[#D1F5E0] border border-[#A3E1B6] px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" />{STATUS_TEXT.complete}</span>;
  }
  if (status === "awaiting") {
    return <span className="text-[11px] text-[#7A5417] bg-[#FFF4D6] border border-[#F2D899] px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />{STATUS_TEXT.awaiting}</span>;
  }
  if (status === "locked") {
    return <span className="text-[11px] text-[#94A3B8]">Låst</span>;
  }
  return (
    <button
      onClick={onAction}
      className={`text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
        status === "in_progress"
          ? "bg-[#0040CC] text-white hover:bg-[#08374b]"
          : "bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC]"
      }`}
    >
      {STATUS_TEXT[status]}
      <ArrowRight className="w-3 h-3" />
    </button>
  );
}
