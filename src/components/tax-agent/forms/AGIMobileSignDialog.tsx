import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { SendMobileSignLinkButton } from "@/components/signing/SendMobileSignLinkButton";

interface Props {
  companyId: string;
  taxYear: number;
  monthIndex: number; // 0-11
  monthLabel: string;
}

/**
 * Wraps SendMobileSignLinkButton with an "on-demand prepare" step that calls
 * `prepare-agi-submission` to build the AGI XML before generating the link.
 */
export const AGIMobileSignDialog = ({ companyId, taxYear, monthIndex, monthLabel }: Props) => {
  const [xml, setXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const periodLabel = `${taxYear}-${String(monthIndex + 1).padStart(2, "0")}`;

  const prepare = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("prepare-agi-submission", {
        body: { company_id: companyId, year: taxYear, month: monthIndex + 1 },
      });
      if (error) throw error;
      const builtXml: string | undefined = data?.xml ?? data?.xmlPayload ?? data?.payload?.xml;
      if (!builtXml) throw new Error("Ingen XML kunde byggas");
      setXml(builtXml);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte bygga AGI-XML");
    } finally {
      setLoading(false);
    }
  };

  if (xml) {
    return (
      <SendMobileSignLinkButton
        companyId={companyId}
        documentType="agi_filing"
        documentTitle={`AGI ${monthLabel} ${taxYear}`}
        periodLabel={periodLabel}
        xmlPayload={xml}
        triggerLabel="Skicka signeringslänk till mobil"
      />
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={prepare} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
      Skicka signeringslänk till mobil
    </Button>
  );
};
