import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileCheck,
  ShieldCheck,
  Mail,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { ScriveSigningButton } from "@/components/signing/ScriveSigningButton";
import { toast } from "sonner";

interface Envelope {
  id: string;
  document_title: string;
  status: string;
  signatories: Array<{
    name: string;
    email: string;
    role?: string;
    use_bankid?: boolean;
    signed_at?: string;
  }>;
  sent_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface Props {
  companyId: string;
  companyName: string;
  fiscalYear: number;
  /** Used to attach the envelope to a specific annual_report row. */
  annualReportId?: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-[#E1F5EE] text-[#085041] gap-1 text-[11px]">
          <CheckCircle2 className="h-3 w-3" />
          Alla har signerat
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="gap-1 text-[11px]">
          <Clock className="h-3 w-3" />
          Väntar på signering
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
          <XCircle className="h-3 w-3" />
          Avbruten
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge variant="outline" className="gap-1 text-[11px]">
          <Clock className="h-3 w-3" />
          Utkast (Scrive ej kopplat)
        </Badge>
      );
  }
};

/**
 * High-priority external signing flow for the annual report.
 *
 * Replaces the previous BankID placeholder. The board, VD and (optionally)
 * the auditor can sit outside the app — they receive an e-mail with a Scrive
 * signing link and complete BankID on their own device. Each envelope is
 * tracked in `signing_envelopes` and progress is shown live.
 */
export const AnnualReportSigningPanel = ({
  companyId,
  companyName,
  fiscalYear,
  annualReportId,
}: Props) => {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("signing_envelopes")
      .select("*")
      .eq("company_id", companyId)
      .eq("document_type", "annual_report")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast.error("Kunde inte hämta signeringar");
    } else {
      setEnvelopes((data ?? []) as unknown as Envelope[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const refreshStatus = async (envelopeId: string) => {
    setRefreshingId(envelopeId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("scrive-signing", {
        body: { action: "check_status", envelope_id: envelopeId, company_id: companyId },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if (data?.envelope) {
        setEnvelopes((prev) =>
          prev.map((e) => (e.id === envelopeId ? { ...e, ...data.envelope } : e))
        );
        toast.success("Status uppdaterad");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte uppdatera status");
    } finally {
      setRefreshingId(null);
    }
  };

  const cancel = async (envelopeId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("scrive-signing", {
        body: { action: "cancel", envelope_id: envelopeId, company_id: companyId },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      toast.success("Signeringen avbruten");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte avbryta");
    }
  };

  const active = envelopes.find((e) => e.status === "pending" || e.status === "draft");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Skicka årsredovisningen för signering
              </CardTitle>
              <CardDescription className="mt-1">
                Styrelse, VD och revisor får var sin e-postlänk och signerar med
                BankID på sin egen enhet. Behöver inte ha konto i Cogniq.
              </CardDescription>
            </div>
            <ScriveSigningButton
              companyId={companyId}
              defaultTitle={`Årsredovisning ${companyName} ${fiscalYear}`}
              documentType="annual_report"
              relatedEntityType="annual_report"
              relatedEntityId={annualReportId}
              triggerLabel={active ? "Ny signeringsrunda" : "Skicka för signering"}
              onComplete={load}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="font-medium mb-0.5">1. Lägg till mottagare</div>
              <div className="text-muted-foreground">
                Styrelseordförande, ledamöter, VD och eventuell revisor.
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="font-medium mb-0.5">2. Mottagaren signerar</div>
              <div className="text-muted-foreground">
                Klickar på e-postlänk, signerar med BankID — ingen inloggning.
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="font-medium mb-0.5">3. Signerad PDF lagras</div>
              <div className="text-muted-foreground">
                Klar för iXBRL-inlämning till Bolagsverket.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Pågående och tidigare signeringar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Laddar…
            </div>
          ) : envelopes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Ingen signering startad än. Klicka på "Skicka för signering" ovan
              för att bjuda in styrelse och revisor.
            </p>
          ) : (
            <div className="space-y-3">
              {envelopes.map((env) => {
                const signed = (env.signatories ?? []).filter((s) => s.signed_at).length;
                const total = (env.signatories ?? []).length;
                return (
                  <div key={env.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {env.document_title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Skickad{" "}
                          {env.sent_at
                            ? new Date(env.sent_at).toLocaleString("sv-SE")
                            : "—"}
                          {" · "}
                          {signed}/{total} signerade
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge(env.status)}
                      </div>
                    </div>

                    {env.signatories && env.signatories.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                        {env.signatories.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[12px] border rounded-md px-2 py-1.5 bg-muted/20"
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate">{s.name}</div>
                              <div className="text-muted-foreground truncate text-[10px]">
                                {s.email}
                              </div>
                            </div>
                            {s.signed_at ? (
                              <Badge className="bg-[#E1F5EE] text-[#085041] gap-1 text-[10px]">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Signerat
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Mail className="h-2.5 w-2.5" />
                                Väntar
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(env.status === "pending" || env.status === "draft") && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => refreshStatus(env.id)}
                          disabled={refreshingId === env.id}
                        >
                          {refreshingId === env.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Uppdatera status
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-destructive"
                          onClick={() => cancel(env.id)}
                        >
                          Avbryt
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
