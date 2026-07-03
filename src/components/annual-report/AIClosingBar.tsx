import { useState } from "react";
import { Lock, Unlock, Sparkles, Loader2, FileText, Eye, Edit3, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAIAnnualSuggestions, type AIAnnualSuggestion } from "@/hooks/useAIAnnualSuggestions";
import { useAnnualReportAdjustments } from "@/hooks/useAnnualReportAdjustments";
import { useDocumentMode, type DocTemplate } from "@/hooks/useDocumentMode";

interface Props {
  annualReportId: string | null;
  companyId: string | null;
  fiscalYear: number;
  framework: "K2" | "K3";
  financials: {
    revenue: number;
    ebit: number;
    netResult: number;
    sumEK: number;
    rörelsemarginal: number;
    soliditet: number;
    balansomslutning: number;
  };
}

const sevColor: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B] border-[#F0DDB7]",
  low: "bg-muted text-muted-foreground border-border",
};

/**
 * Combined AI Closing Bar — top-of-page command surface.
 * Renders: lock/edit toggle, role/template/document-mode selectors,
 * "Generate full report" CTA, and ranked AI suggestions inline.
 */
export const AIClosingBar = ({ annualReportId, companyId, fiscalYear, framework, financials }: Props) => {
  const { mode, setMode, role, setRole, template, setTemplate, isUnlocked } = useDocumentMode();
  const { data: suggestions = [], dismiss, detect } = useAIAnnualSuggestions(annualReportId);
  const { create: createAdj } = useAnnualReportAdjustments(annualReportId, companyId);
  const [generating, setGenerating] = useState(false);

  const pending = suggestions.filter((s) => s.status === "pending");
  const ranked = [...pending].sort((a, b) => {
    const sevRank = (s: AIAnnualSuggestion) => (s.severity === "high" ? 3 : s.severity === "medium" ? 2 : 1);
    return sevRank(b) - sevRank(a) || (b.confidence - a.confidence);
  });

  const handleGenerate = async () => {
    if (!annualReportId || !companyId) {
      toast.error("Välj bolag och år först");
      return;
    }
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-annual-report-ai", {
        body: {
          annual_report_id: annualReportId,
          company_id: companyId,
          fiscal_year: fiscalYear,
          framework,
          tone_mode: role,
          financials,
        },
      });
      if (error) throw error;
      toast.success("Årsredovisning genererad — text uppdaterad");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte generera");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async (s: AIAnnualSuggestion) => {
    if (!s.proposed_adjustment) {
      toast.error("Detta förslag har ingen automatisk justering — granska manuellt");
      return;
    }
    await createAdj.mutateAsync({
      account_number: s.proposed_adjustment.account_number,
      debit: Number(s.proposed_adjustment.debit) || 0,
      credit: Number(s.proposed_adjustment.credit) || 0,
      description: s.proposed_adjustment.description,
      affected_areas: s.proposed_adjustment.affected_areas || [],
      source: "ai_suggestion",
      ai_suggestion_id: s.id,
      confidence: s.confidence,
    });
    await supabase
      .from("annual_report_ai_suggestions")
      .update({ status: "applied" })
      .eq("id", s.id);
  };

  return (
    <Card className="border-border/60 bg-gradient-to-br from-background to-muted/20 mb-6">
      {/* Top control bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/60">
        <Button
          size="sm"
          variant={isUnlocked ? "default" : "outline"}
          onClick={() => setMode(isUnlocked ? "document" : "edit")}
          className="gap-2"
        >
          {isUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {isUnlocked ? "Redigeringsläge" : "Lås upp & redigera"}
        </Button>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === "edit" ? "secondary" : "ghost"}
            onClick={() => setMode("edit")}
            className="gap-1.5"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant={mode === "document" ? "secondary" : "ghost"}
            onClick={() => setMode("document")}
            className="gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            Dokument
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Role mode */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Vy:</span>
          <Button
            size="sm"
            variant={role === "business_owner" ? "secondary" : "ghost"}
            onClick={() => setRole("business_owner")}
            className="gap-1.5"
          >
            <User className="h-3.5 w-3.5" />
            Företagare
          </Button>
          <Button
            size="sm"
            variant={role === "accountant" ? "secondary" : "ghost"}
            onClick={() => setRole("accountant")}
            className="gap-1.5"
          >
            <Briefcase className="h-3.5 w-3.5" />
            Redovisare
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Template */}
        <Select value={template} onValueChange={(v) => setTemplate(v as DocTemplate)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minimal">Mall: Minimal</SelectItem>
            <SelectItem value="big4">Mall: Big 4</SelectItem>
            <SelectItem value="fintech">Mall: Fintech</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => detect.mutate({ companyId: companyId!, fiscalYear })}
            disabled={!annualReportId || detect.isPending}
            className="gap-2"
          >
            {detect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Skanna efter justeringar
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={!annualReportId || generating}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generera hela rapporten
          </Button>
        </div>
      </div>

      {/* AI Suggestions inline */}
      {ranked.length > 0 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI-förslag på bokslutsjusteringar</span>
            <Badge variant="secondary">{ranked.length}</Badge>
          </div>
          <ScrollArea className="max-h-72">
            <div className="space-y-2">
              {ranked.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-lg border p-3 ${sevColor[s.severity] || sevColor.low}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{s.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(s.confidence * 100)}% säkerhet
                        </Badge>
                        {s.confidence < 0.6 && (
                          <Badge variant="outline" className="text-[10px] bg-[#FAEEDA]">
                            Granska noga
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs opacity-90">{s.explanation}</p>
                      {s.impact_amount !== null && (
                        <p className="text-xs mt-1 font-medium">
                          Påverkan på resultatet: {Math.round(Number(s.impact_amount)).toLocaleString("sv-SE")} kr
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {s.proposed_adjustment && (
                        <Button size="sm" variant="default" onClick={() => handleApply(s)} className="h-7 text-xs">
                          Tillämpa justering
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismiss.mutate({ id: s.id })}
                        className="h-7 text-xs"
                      >
                        Avfärda
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {ranked.length === 0 && annualReportId && (
        <div className="p-4 text-xs text-muted-foreground text-center">
          Inga AI-förslag just nu. Klicka "Skanna efter justeringar" för att leta efter periodiseringar, avskrivningar, varianser och saknade noter.
        </div>
      )}
    </Card>
  );
};
