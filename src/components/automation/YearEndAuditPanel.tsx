import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Brain,
  ChevronDown,
  ChevronUp,
  Wand2,
} from "lucide-react";

interface YearEndAuditPanelProps { companyId: string;
}

interface RuleCheck { id: string;
  name: string;
  status: "pass" | "fail" | "warning";
  detail: string;
  fixable?: boolean;
  fix_action?: string;
}

interface AIObservation { severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  recommendation: string;
  fixable?: boolean;
  fix_type?: string;
}

interface AuditResult { overall_status: "pass" | "fail" | "warning";
  ready_for_submission: boolean;
  rule_checks: RuleCheck[];
  fixable_count: number;
  ai_analysis: { risk_level: string;
    summary: string;
    observations: AIObservation[];
    ready_for_submission: boolean;
  } | null;
  stats: { total_entries: number;
    total_debit: number;
    total_credit: number;
    total_revenue: number;
    total_costs?: number;
    pre_tax_result?: number;
    account_count: number;
  };
}

interface FixResult { action: string;
  success: boolean;
  detail: string;
}

const statusIcon = (status: string) => { switch (status) { case "pass":
      return <CheckCircle className="w-4 h-4 text-[#085041]" />;
    case "fail":
      return <XCircle className="w-4 h-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-[#7A5417]" />;
    default:
      return <Info className="w-4 h-4 text-muted-foreground" />;
  }
};

const severityBadge = (severity: string) => { switch (severity) { case "critical":
      return <Badge variant="destructive">Kritisk</Badge>;
    case "warning":
      return <Badge className="bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]">Varning</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
};

export const YearEndAuditPanel = ({ companyId }: YearEndAuditPanelProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [fixResults, setFixResults] = useState<FixResult[] | null>(null);
  const [showAIDetails, setShowAIDetails] = useState(true);
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear - 1);

  const handleRunAudit = async () => { setLoading(true);
    setResult(null);
    setFixResults(null);
    try { const { data, error } = await supabase.functions.invoke("ai-year-end-audit", { body: { company_id: companyId, fiscal_year: fiscalYear },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Audit failed");
      setResult(data);
      toast({ title: "Granskning klar!",
        description: data.ready_for_submission
          ? "Inga blockerande fel hittades"
          : `${data.fixable_count || 0} problem kan åtgärdas automatiskt`,
      });
    } catch (error) { console.error("Audit error:", error);
      toast({ title: "Fel vid granskning",
        description: error instanceof Error ? error.message : "Kunde inte genomföra granskning",
        variant: "destructive",
      });
    } finally { setLoading(false);
    }
  };

  const handleAutoFix = async () => { setFixing(true);
    setFixResults(null);
    try { const { data, error } = await supabase.functions.invoke("ai-year-end-audit", { body: { company_id: companyId, fiscal_year: fiscalYear, action: "auto_fix" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Auto-fix failed");

      setFixResults(data.fixes);

      const successCount = data.fixes.filter((f: FixResult) => f.success).length;
      toast({ title: successCount > 0 ? "Automatisk åtgärd klar!" : "Inga åtgärder utförda",
        description: data.message,
      });

      // Re-run audit to show updated state
      if (successCount > 0) { setTimeout(() => handleRunAudit(), 1000);
      }
    } catch (error) { console.error("Auto-fix error:", error);
      toast({ title: "Fel vid automatisk åtgärd",
        description: error instanceof Error ? error.message : "Kunde inte åtgärda problem",
        variant: "destructive",
      });
    } finally { setFixing(false);
    }
  };

  const passCount = result?.rule_checks.filter((c) => c.status === "pass").length || 0;
  const totalChecks = result?.rule_checks.length || 0;
  const hasFixableIssues = result && (result.fixable_count || 0) > 0 && !result.ready_for_submission;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          AI-granskning före inlämning
          <Badge variant="secondary" className="ml-auto text-xs">
            <Brain className="w-3 h-3 mr-1" />
            AI
          </Badge>
        </CardTitle>
        <CardDescription>
          AI analyserar och <strong>åtgärdar automatiskt</strong> bokslutsproblem – bolagsskatt, bokslutstransaktioner
          och ogodkända verifikat fixas med ett klick
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Räkenskapsår</label>
            <Select value={String(fiscalYear)} onValueChange={(v) => { setFiscalYear(parseInt(v)); setResult(null); setFixResults(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                <SelectItem value={String(currentYear - 2)}>{currentYear - 2}</SelectItem>
                <SelectItem value={String(currentYear - 3)}>{currentYear - 3}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRunAudit} disabled={loading || fixing}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Granskar...</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Granska</>
              )}
            </Button>
            {hasFixableIssues && (
              <Button onClick={handleAutoFix} disabled={fixing || loading} variant="default" className="bg-primary">
                {fixing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Åtgärdar...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" />Autofix ({result.fixable_count})</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Fix results */}
        {fixResults && fixResults.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg border bg-primary/5 border-primary/20">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Automatiska åtgärder
            </h4>
            {fixResults.map((fix, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {fix.success ? (
                  <CheckCircle className="w-4 h-4 text-[#085041] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                )}
                <span className={fix.success ? "text-foreground" : "text-muted-foreground"}>{fix.detail}</span>
              </div>
            ))}
          </div>
        )}

        {result && (
          <>
            {/* Overall status */}
            <div className={`p-4 rounded-lg border ${ result.overall_status === "pass"
                ? "bg-[#E1F5EE] border-green-500/30"
                : result.overall_status === "fail"
                ? "bg-destructive/10 border-destructive/30"
                : "bg-[#FAEEDA] border-[#F0DDB7]"
            }`}>
              <div className="flex items-center gap-3">
                {result.overall_status === "pass" ? (
                  <CheckCircle className="w-6 h-6 text-[#085041]" />
                ) : result.overall_status === "fail" ? (
                  <XCircle className="w-6 h-6 text-destructive" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-[#7A5417]" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">
                    {result.ready_for_submission
                      ? "Redo för inlämning"
                      : "Åtgärder krävs innan inlämning"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {passCount}/{totalChecks} kontroller godkända •{" "}
                    {result.stats.total_entries} verifikat •{" "}
                    {result.stats.total_revenue.toLocaleString("sv-SE")} kr intäkter
                    {result.stats.pre_tax_result !== undefined && (
                      <> • Resultat: {result.stats.pre_tax_result.toLocaleString("sv-SE")} kr</>
                    )}
                  </p>
                </div>
                {hasFixableIssues && !fixResults && (
                  <Button size="sm" onClick={handleAutoFix} disabled={fixing} className="shrink-0">
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Fixa allt
                  </Button>
                )}
              </div>
            </div>

            {/* Rule checks */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Regelkontroller</h4>
              {result.rule_checks.map((check) => (
                <div key={check.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  {statusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                  {check.fixable && check.status !== "pass" && (
                    <Badge variant="outline" className="text-xs shrink-0 text-primary border-primary/30">
                      <Wand2 className="w-3 h-3 mr-1" />Autofix
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* AI analysis */}
            {result.ai_analysis && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowAIDetails(!showAIDetails)}
                  className="flex items-center gap-2 text-sm font-semibold w-full"
                >
                  <Brain className="w-4 h-4 text-primary" />
                  AI-analys
                  <Badge variant="outline" className="ml-1 text-xs">
                    Risk: {result.ai_analysis.risk_level === "low" ? "Låg" : result.ai_analysis.risk_level === "medium" ? "Medel" : "Hög"}
                  </Badge>
                  {showAIDetails ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                </button>

                {showAIDetails && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{result.ai_analysis.summary}</p>
                    {result.ai_analysis.observations.map((obs, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card space-y-1">
                        <div className="flex items-center gap-2">
                          {severityBadge(obs.severity)}
                          <span className="text-sm font-medium">{obs.title}</span>
                          {obs.fixable && (
                            <Badge variant="outline" className="text-xs ml-auto text-primary border-primary/30">
                              <Wand2 className="w-3 h-3 mr-1" />Autofix
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{obs.detail}</p>
                        <p className="text-xs text-primary">→ {obs.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!result && !loading && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Granskningen kontrollerar och åtgärdar:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Huvudbok i balans (debet = kredit)</li>
              <li>✓ Godkänner balanserade utkast-verifikat automatiskt</li>
              <li>✓ Bokför bolagsskatt (20,6%) om den saknas</li>
              <li>✓ Skapar bokslutstransaktioner (8999/2099)</li>
              <li>✓ Momsavstämning mot deklarationer</li>
              <li>✓ Löpande bokföring alla månader</li>
              <li>✓ AI-analys av rimliga proportioner och branschspecifika risker</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
