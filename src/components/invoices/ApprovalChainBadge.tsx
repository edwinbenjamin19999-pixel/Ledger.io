import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { buildApprovalChain } from "@/hooks/useInvoiceApproval";

interface Props {
  companyId: string;
  amount: number;
  approvalStep?: number | null;
  attestedByEmail?: string | null;
  nextApproverEmail?: string | null;
}

/**
 * Compact badge that shows where the invoice is in its 2- or 4-eye chain.
 */
export const ApprovalChainBadge = ({
  companyId,
  amount,
  approvalStep,
  nextApproverEmail,
}: Props) => {
  const { requiredSteps, mode } = buildApprovalChain(companyId, amount ?? 0);
  const step = approvalStep ?? 0;

  if (requiredSteps <= 1) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px] text-slate-600 border-slate-200">
        <Users className="h-2.5 w-2.5" />
        2-ögon
      </Badge>
    );
  }

  if (step >= requiredSteps) {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-[10px] text-[#085041] border-[#BFE6D6] bg-[#E1F5EE]"
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        4-ögon · {step}/{requiredSteps}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 text-[10px] text-[#7A5417] border-[#F0DDB7] bg-[#FAEEDA]"
      title={
        nextApproverEmail
          ? `Väntar på ${nextApproverEmail}`
          : `4-ögon (${mode === "four_threshold" ? "över tröskel" : "alltid"})`
      }
    >
      <Clock className="h-2.5 w-2.5" />
      4-ögon · steg {step}/{requiredSteps}
    </Badge>
  );
};
