import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Landmark, ArrowRight, X } from "lucide-react";

interface Props {
  companyId: string;
}

/**
 * Yellow banner shown on the dashboard when the user has explicitly skipped
 * bank linking during onboarding AND still has no bank accounts connected.
 */
export const BankSkippedBanner = ({ companyId }: Props) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: company } = await (supabase
          .from("companies")
          .select("metadata")
          .eq("id", companyId)
          .maybeSingle() as unknown as Promise<{ data: { metadata: Record<string, unknown> | null } | null }>);

        const meta = (company?.metadata as Record<string, unknown> | null) ?? {};
        const skipped = meta.onboarding_bank_skipped === true;
        if (!skipped) {
          if (!cancelled) setVisible(false);
          return;
        }

        const { count } = await supabase
          .from("bank_accounts")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId);

        if (!cancelled) setVisible((count ?? 0) === 0);
      } catch {
        if (!cancelled) setVisible(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (!visible || dismissed) return null;

  return (
    <div className="rounded-xl border border-[#F0DDB7] bg-[#FAEEDA] dark:bg-amber-950/30 dark:border-amber-900/50 p-4 mb-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-[#FAEEDA] dark:bg-amber-900/40">
        <Landmark className="h-5 w-5 text-[#7A5417] dark:text-[#C28A2B]" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-[#7A5417] dark:text-amber-200 text-sm">
          Aktivera bankkoppling
        </p>
        <p className="text-[#7A5417] dark:text-amber-300 text-sm mt-0.5">
          Koppla din bank för att få full nytta av AI-bokföring, automatisk avstämning och betalningar.
        </p>
        <Link
          to="/bank-integration"
          className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-[#7A5417] dark:text-amber-200 hover:text-[#7A5417] dark:hover:text-amber-100"
        >
          Koppla bank nu <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-[#FAEEDA] dark:hover:bg-amber-900/40 text-[#7A5417] dark:text-[#C28A2B]"
        aria-label="Stäng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
