import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, type PaymentBatchStatus } from "@/lib/payments/statusTaxonomy";

interface Props {
  status: string;
  className?: string;
}

const toneClasses: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-[#EFF6FF] text-sky-800 border-[#C8DDF5] dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800",
  warning: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800",
  success: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-800",
  danger: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] dark:bg-red-900/40 dark:text-red-100 dark:border-red-800",
};

export function PaymentStatusBadge({ status, className }: Props) {
  const key = status as PaymentBatchStatus;
  const label = PAYMENT_STATUS_LABEL[key] ?? status;
  const tone = PAYMENT_STATUS_TONE[key] ?? "neutral";
  return (
    <Badge variant="outline" className={cn("font-medium", toneClasses[tone], className)}>
      {label}
    </Badge>
  );
}
