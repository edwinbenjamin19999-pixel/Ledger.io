import { cn } from "@/lib/utils";
import { getStateMeta } from "@/lib/ap/workflowState";

interface Props {
  state: string | null | undefined;
  approvalStep?: number | null;
  requiredSteps?: number | null;
  className?: string;
}

/**
 * State-driven badge for AP invoices.
 * Approval progress (X/Y) is only displayed when state === IN_APPROVAL_FLOW
 * AND at least one step has been taken.
 */
export function WorkflowStateBadge({
  state,
  approvalStep,
  requiredSteps,
  className,
}: Props) {
  const meta = getStateMeta(state);
  const showSteps =
    meta.showApprovalSteps &&
    typeof approvalStep === "number" &&
    approvalStep > 0 &&
    typeof requiredSteps === "number" &&
    requiredSteps > 1 &&
    approvalStep < requiredSteps;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[8px] py-px",
        meta.className,
        className,
      )}
    >
      {meta.label}
      {showSteps && (
        <span className="opacity-70 normal-case tracking-normal">
          {approvalStep}/{requiredSteps}
        </span>
      )}
    </span>
  );
}
