import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodPreviewProps {
  debitAccount: string;
  debitAccountName: string;
  creditAccount: string;
  creditAccountName: string;
  amount: number;
  vatRate?: number;
  currency?: string;
}

export function PaymentMethodPreview({
  debitAccount,
  debitAccountName,
  creditAccount,
  creditAccountName,
  amount,
  vatRate,
  currency = "SEK",
}: PaymentMethodPreviewProps) {
  const [open, setOpen] = useState(false);

  const absAmount = Math.abs(amount);
  const hasVat = vatRate && vatRate > 0;
  const vatAmount = hasVat ? Math.round(absAmount * (vatRate / (100 + vatRate))) : 0;
  const netAmount = absAmount - vatAmount;

  const fmt = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Visa bokföringsförslag
      </button>

      {open && (
        <div className="mt-2 rounded-lg border bg-card/50 p-3 space-y-1 font-mono text-xs animate-fade-in">
          <Row side="Dr" account={debitAccount} name={debitAccountName} amount={hasVat ? netAmount : absAmount} variant="debit" />
          {hasVat && (
            <Row side="Dr" account="2640" name="Ingående moms" amount={vatAmount} variant="debit" />
          )}
          <div className="border-t border-border/50 my-1" />
          <Row side="Cr" account={creditAccount} name={creditAccountName} amount={absAmount} variant="credit" />
        </div>
      )}
    </div>
  );
}

function Row({ side, account, name, amount, variant }: {
  side: string;
  account: string;
  name: string;
  amount: number;
  variant: "debit" | "credit";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          "w-5 text-center font-semibold",
          variant === "debit" ? "text-[#085041] dark:text-[#1D9E75]" : "text-blue-600 dark:text-[#1E3A5F]"
        )}>
          {side}
        </span>
        <span className="text-foreground">{account}</span>
        <span className="text-muted-foreground truncate">{name}</span>
      </div>
      <span className="shrink-0 tabular-nums text-foreground">
        {amount.toLocaleString("sv-SE")} kr
      </span>
    </div>
  );
}
