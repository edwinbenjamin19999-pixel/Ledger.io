import { useEffect, useState } from "react";
import { Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  companyId: string | null;
  variant?: "desktop" | "mobile";
}

export const EmailInboxAddressCard = ({ companyId, variant = "desktop" }: Props) => {
  const [emailAddr, setEmailAddr] = useState<string>("—");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("email_inbox_address")
        .eq("id", companyId)
        .maybeSingle();
      if (data?.email_inbox_address) {
        setEmailAddr(data.email_inbox_address);
      } else {
        const generated = `bokforing-${companyId.slice(0, 8)}@inbox.northledger.se`;
        await supabase
          .from("companies")
          .update({ email_inbox_address: generated })
          .eq("id", companyId);
        setEmailAddr(generated);
      }
    })();
  }, [companyId]);

  const copy = () => {
    if (emailAddr === "—") return;
    navigator.clipboard.writeText(emailAddr);
    setCopied(true);
    toast.success("E-postadress kopierad");
    setTimeout(() => setCopied(false), 1500);
  };

  if (variant === "mobile") {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-foreground font-semibold">Maila underlag</p>
            <p className="text-muted-foreground text-xs">AI bokför automatiskt</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-xs font-mono text-foreground truncate border border-border">
            {emailAddr}
          </code>
          <button
            onClick={copy}
            className="text-xs font-semibold text-primary active:scale-[0.97] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {copied ? <Check className="h-4 w-4" /> : "Kopiera"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">Maila underlag direkt</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Vidarebefordra kvitton och fakturor till adressen nedan — AI bokför automatiskt.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono text-foreground truncate border border-border">
              {emailAddr}
            </code>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-2">{copied ? "Kopierad" : "Kopiera"}</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Tips: Spara adressen som kontakt i mobilen — sedan vidarebefordrar du kvitton från Apple/Google Wallet, butiker och leverantörer direkt.
          </p>
        </div>
      </div>
    </div>
  );
};
