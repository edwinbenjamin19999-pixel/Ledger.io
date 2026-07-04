import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  invoiceId: string;
  totalAmount: number;
  threshold?: number;
}

interface AssetCandidate {
  description: string;
  account_number: string;
  account_name: string;
  amount: number;
}

/**
 * Detects if an incoming supplier invoice should be capitalised as a fixed asset.
 * Triggers when total > threshold AND at least one line is booked to a 1xxx asset account.
 */
export const AssetActivationBanner = ({ invoiceId, totalAmount, threshold = 10000 }: Props) => {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<AssetCandidate | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (totalAmount < threshold || !invoiceId) return;
    let cancelled = false;
    (async () => {
      const { data: lines } = await supabase
        .from("invoice_lines")
        .select("description, total_amount, account_id")
        .eq("invoice_id", invoiceId);
      if (cancelled || !lines?.length) return;
      const accountIds = lines.map((l) => l.account_id).filter(Boolean) as string[];
      if (!accountIds.length) return;
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name")
        .in("id", accountIds);
      if (cancelled || !accounts?.length) return;
      // Find first line booked to a 1xxx asset account (excluding 14xx inventory & 15xx receivables)
      for (const line of lines) {
        const acc = accounts.find((a) => a.id === line.account_id);
        if (!acc) continue;
        const num = String(acc.account_number);
        if (/^1[0-3]/.test(num) || /^12/.test(num)) {
          setCandidate({
            description: line.description,
            account_number: num,
            account_name: acc.account_name,
            amount: Number(line.total_amount),
          });
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, totalAmount, threshold]);

  if (!candidate || dismissed) return null;

  return (
    <div className="mx-4 sm:mx-8 mt-4 rounded-[12px] border-[0.5px] border-[#3b82f6]/30 bg-[#3b82f6]/5 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[#3b82f6] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Denna kostnad verkar vara en investering snarare än en direkt kostnad
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Bokförd på {candidate.account_number} {candidate.account_name} ·{" "}
            {Math.round(candidate.amount).toLocaleString("sv-SE")} kr. Vill du lägga till den i anläggningsregistret?
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="h-8 bg-[#3b82f6] hover:bg-[#0052FF] text-white"
              onClick={() =>
                navigate(
                  `/depreciation?fromInvoice=${invoiceId}&name=${encodeURIComponent(
                    candidate.description,
                  )}&cost=${candidate.amount}&account=${candidate.account_number}`,
                )
              }
            >
              Lägg till i register <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setDismissed(true)}>
              Avvisa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
