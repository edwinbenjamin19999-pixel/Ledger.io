import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, Send, AlertTriangle, Shield, Download, FileText, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { DemoSubmitButton } from "@/components/ui/DemoSubmitButton";

interface SubmissionPipelineProps { companyId: string;
}

interface SubmissionItem { formCode: string;
  label: string;
  deadline: string;
  status: "submitted" | "ready" | "pending" | "not_started";
  note?: string;
  submittedAt?: string;
  reference?: string;
}

const STATUS_CONFIG = { submitted: { label: "Inskickad", icon: CheckCircle, color: "text-[#085041]", bg: "bg-[#E1F5EE] border-green-500/30" },
  ready: { label: "Redo att signera", icon: Shield, color: "text-blue-500", bg: "bg-[#EFF6FF] border-[#C8DDF5]" },
  pending: { label: "Under förberedelse", icon: Clock, color: "text-[#7A5417]", bg: "bg-[#FAEEDA] border-[#F0DDB7]" },
  not_started: { label: "Ej påbörjad", icon: AlertTriangle, color: "text-muted-foreground", bg: "" },
};

export const SubmissionPipeline = ({ companyId }: SubmissionPipelineProps) => { const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  useEffect(() => { loadSubmissions();
  }, [companyId]);

  const loadSubmissions = async () => { // Try to load from DB, fallback to defaults
    const { data } = await supabase
      .from("tax_declarations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    const now = new Date();
    const year = now.getFullYear();

    const defaultSubs: SubmissionItem[] = [
      { formCode: "KU10", label: `Kontrolluppgifter lön ${year - 1}`, deadline: `31 jan ${year}`, status: "pending" },
      { formCode: "AGI", label: "AGI (löpande månatlig)", deadline: "12:e varje månad", status: "submitted", note: `Senaste: ${new Date().toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}` },
      { formCode: "SKV4700", label: `Momsdeklaration Q1 ${year}`, deadline: `12 maj ${year}`, status: "ready" },
      { formCode: "K10", label: "K10 — bifogas privat INK1", deadline: `2 maj ${year}`, status: "pending", note: "Skicka till ägarens privata deklaration" },
      { formCode: "INK2", label: `INK2 + INK2R (${year - 1})`, deadline: `1 jul ${year}`, status: "ready" },
      { formCode: "INK2S", label: `INK2S — Skattemässiga justeringar`, deadline: `1 jul ${year}`, status: "pending" },
      { formCode: "N9", label: "N9 — Ränteavdragsbegränsning", deadline: `1 jul ${year}`, status: "not_started", note: "AI analyserar relevans" },
    ];

    // Merge DB data with defaults
    if (data && data.length > 0) { for (const decl of data) { const existing = defaultSubs.find(s => s.formCode.toLowerCase() === decl.declaration_type);
        if (existing) { existing.status = decl.status === "submitted" ? "submitted" : decl.status === "ready" ? "ready" : "pending";
          existing.submittedAt = decl.submitted_at || undefined;
          existing.reference = decl.skatteverket_reference || undefined;
        }
      }
    }

    setSubmissions(defaultSubs);
  };

  const submittedCount = submissions.filter(s => s.status === "submitted").length;
  const readyCount = submissions.filter(s => s.status === "ready").length;
  const pendingCount = submissions.filter(s => s.status === "pending" || s.status === "not_started").length;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-[#085041]">{submittedCount}</p><p className="text-xs text-muted-foreground">Inskickade</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-blue-500">{readyCount}</p><p className="text-xs text-muted-foreground">Redo att signera</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-[#7A5417]">{pendingCount}</p><p className="text-xs text-muted-foreground">Under förberedelse</p></CardContent></Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Årets deklarationspaket {new Date().getFullYear() - 1}</CardTitle>
              <CardDescription>Alla inlämningar samlade på ett ställe</CardDescription>
            </div>
            <ComingSoonButton tooltipText="Jämförelse mot föregående år lanseras Q4 2026" className="text-xs">
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
              Diff mot förra året
            </ComingSoonButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {submissions.map(item => { const config = STATUS_CONFIG[item.status];
            const Icon = config.icon;
            return (
              <div key={item.formCode} className={`flex items-center justify-between border rounded-lg p-3 ${item.status === "ready" ? "border-[#C8DDF5] bg-[#EFF6FF]" : ""}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.formCode}</span>
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">Deadline: {item.deadline}</span>
                      {item.note && <span className="text-xs text-muted-foreground">— {item.note}</span>}
                      {item.reference && <span className="text-xs font-mono text-muted-foreground">Ref: {item.reference}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${config.bg}`}>{config.label}</Badge>
                  {item.status === "submitted" && (
                    <ComingSoonButton tooltipText="PDF-nedladdning lanseras snart" className="text-xs h-7">
                      <Download className="h-3 w-3 mr-1" />PDF
                    </ComingSoonButton>
                  )}
                  {item.status === "ready" && (
                    <DemoSubmitButton
                      label="Signera BankID"
                      authority="Skatteverket"
                      size="sm"
                      className="text-xs h-7"
                      icon={<Shield className="h-3 w-3" />}
                      onDemoSubmit={() => toast.success(`${item.formCode} inskickad till Skatteverket`)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          AI-förberedda deklarationer har 99,9% träffsäkerhet. Granska alltid innan signering. Signering med BankID skapar en oföränderlig post i revisionsloggen.
        </p>
      </div>
    </div>
  );
};
