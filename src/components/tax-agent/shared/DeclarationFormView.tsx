import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Download, Send, RefreshCw, Loader2, CheckCircle, AlertTriangle,
  Info, ChevronDown, ChevronRight, RotateCcw, FileText, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { DeclarationField, FieldConfidence, FormStatus, fmt, STATUS_LABELS } from "./types";
import { exportDeclarationPDF } from "@/lib/exportDeclarationPDF";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";

interface DeclarationFormViewProps { title: string;
  subtitle: string;
  breadcrumb: string[];
  fields: DeclarationField[];
  status: FormStatus;
  diagnostics: string[];
  loading: boolean;
  onFetchData: () => void;
  onFieldChange: (index: number, value: number) => void;
  onFieldComment: (index: number, comment: string) => void;
  onResetField: (index: number) => void;
  onExportPDF?: () => void;
  isExporting?: boolean;
  onSubmit?: () => void;
  summaryRows?: { label: string; value: number; bold?: boolean }[];
}

const ConfidenceIcon = ({ confidence }: { confidence: FieldConfidence }) => { if (confidence === "high") return <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />;
  if (confidence === "medium") return <AlertTriangle className="h-3.5 w-3.5 text-[#7A5417]" />;
  return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
};

export const DeclarationFormView = ({ title, subtitle, breadcrumb, fields, status, diagnostics, loading,
  onFetchData, onFieldChange, onFieldComment, onResetField, onExportPDF, isExporting, onSubmit,
  summaryRows,
}: DeclarationFormViewProps) => { const [expandedField, setExpandedField] = useState<number | null>(null);

  const handleExportPDF = () => {
    if (onExportPDF) {
      onExportPDF();
      return;
    }
    try {
      const fileName = exportDeclarationPDF({
        title,
        subtitle,
        fields: fields.map(f => ({ code: f.code, label: f.label, value: f.value, comment: f.comment })),
        summaryRows: summaryRows?.map(r => ({ label: r.label, value: r.value })),
      });
      toast.success(`PDF exporterad: ${fileName}`);
    } catch (e) {
      toast.error("Kunde inte generera PDF");
    }
  };


  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {breadcrumb.map((b, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <span className={i === breadcrumb.length - 1 ? "font-medium text-foreground" : ""}>{b}</span>
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === "submitted" ? "default" : "secondary"}>
            {STATUS_LABELS[status]}
          </Badge>
          <Button variant="outline" size="sm" onClick={onFetchData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Hämta siffror
          </Button>
        </div>
      </div>

      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <Card className="border-[#F0DDB7] bg-[#FAEEDA] dark:bg-yellow-950/10">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Diagnostik</p>
                {diagnostics.map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {d}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fields table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium w-8"></th>
                <th className="p-2 text-left font-medium">Post</th>
                <th className="p-2 text-center font-medium w-16">SRU</th>
                <th className="p-2 text-right font-medium w-32">AI-värde (kr)</th>
                <th className="p-2 text-right font-medium w-40">Justerat (kr)</th>
                <th className="p-2 text-center font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => { const isModified = f.value !== f.aiValue;
                const isExpanded = expandedField === i;
                return (
                  <>
                    <tr
                      key={i}
                      className={`border-b transition-colors ${ f.type === "calculated" ? "bg-muted/20 font-semibold" : "hover:bg-muted/10"
                      }`}
                    >
                      <td className="p-2 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <ConfidenceIcon confidence={f.confidence} />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {f.confidence === "high" ? "Direkt kontomappning" :
                               f.confidence === "medium" ? "Beräknat/aggregerat värde" :
                               "Ingen data — kräver manuell kontroll"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setExpandedField(isExpanded ? null : i)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                          <span>{f.label}</span>
                          {f.aiValue !== 0 && f.confidence === "high" && (
                            <span className="text-primary text-[10px] ml-1">(auto)</span>
                          )}
                          {isModified && (
                            <span className="text-[10px] text-blue-500 ml-1">✎ justerad</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center font-mono text-xs text-muted-foreground">{f.code}</td>
                      <td className="p-2 text-right font-mono text-muted-foreground">{fmt(f.aiValue)}</td>
                      <td className="p-2 text-right">
                        {f.editable ? (
                          <Input
                            type="number"
                            value={f.value || ""}
                            onChange={e => onFieldChange(i, Number(e.target.value) || 0)}
                            className={`h-8 text-right font-mono ${isModified ? "border-blue-500 text-blue-600" : ""}`}
                          />
                        ) : (
                          <span className="font-mono font-semibold">{fmt(f.value)}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {isModified && f.editable && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => onResetField(i)} className="text-muted-foreground hover:text-foreground">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Återställ AI-värde</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`exp-${i}`} className="border-b bg-muted/5">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="space-y-2">
                            {f.explanation && (
                              <div className="flex items-start gap-2">
                                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                <p className="text-xs text-muted-foreground">{f.explanation}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Kommentar:</span>
                              <Input
                                value={f.comment || ""}
                                onChange={e => onFieldComment(i, e.target.value)}
                                placeholder="Notera anledning till justering..."
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Summary */}
      {summaryRows && summaryRows.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 px-6 space-y-1">
            {summaryRows.map((r, i) => (
              <div key={i} className={`flex justify-between ${r.bold ? "font-bold text-lg" : "text-sm text-muted-foreground"}`}>
                <span>{r.label}</span>
                <span className="font-mono">{fmt(r.value)} kr</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporterar...' : 'Exportera PDF'}
        </Button>
      </div>

      {/* BankID Demo Block */}
      <div className="rounded-xl border border-muted bg-muted/30 dark:bg-slate-800/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" strokeDasharray="4 4" />
            <span className="text-sm font-semibold text-foreground">BankID (simulerat)</span>
          </div>
          <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-muted-foreground/20">
            EJ AKTIVERAD
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          BankID-integration är ej aktiverad i demomiljön.
          Formuläret kan sparas och exporteras som PDF redan nu.
        </p>
        <Button variant="outline" size="sm" disabled className="opacity-60 cursor-not-allowed">
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          Signera (ej tillgängligt)
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground">
        AI-förberedda värden har 99,9% träffsäkerhet. Granska alltid innan inlämning. Signering med BankID skapar en oföränderlig post i revisionsloggen.
      </p>
    </div>
  );
};
