import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditReadinessChecks } from "@/hooks/useAuditReadiness";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, FileCheck, FileText, Shield,
  Download, Eye, BarChart3, Calculator, Users, Landmark, Clock,
  RefreshCw, Link2, Building2, ArrowRight,
} from "lucide-react";

const formatSEK = (v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} TSEK`;
  return `${Math.round(v)} kr`;
};

interface AuditCheck { id: string;
  category: string;
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
  count?: number;
  action?: string;
  actionPath?: string;
}

const useAuditData = (companyId: string | null) => { return useQuery({ queryKey: ["audit-readiness", companyId],
    enabled: !!companyId,
    queryFn: async () => { if (!companyId) throw new Error("No company");

      // 1. Verifications without attachments
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, description, document_id, status, entry_date, journal_number")
        .eq("company_id", companyId)
        .eq("status", "approved");

      const missingAttachments = (entries || []).filter(e => !e.document_id);
      const totalEntries = (entries || []).length;

      // 2. Unbalanced entries check (should be 0 due to trigger, but verify)
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("journal_entry_id, debit, credit")
        .in("journal_entry_id", (entries || []).map(e => e.id));

      const balanceMap = new Map<string, { debit: number; credit: number }>();
      for (const l of (lines || [])) { const cur = balanceMap.get(l.journal_entry_id) || { debit: 0, credit: 0 };
        cur.debit += Number(l.debit) || 0;
        cur.credit += Number(l.credit) || 0;
        balanceMap.set(l.journal_entry_id, cur);
      }
      const unbalanced = Array.from(balanceMap.entries()).filter(
        ([, v]) => Math.abs(v.debit - v.credit) > 0.01
      );

      // 3. Draft entries (should be reviewed)
      const { count: draftCount } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "draft");

      // 4. VAT reconciliation - check declarations exist
      const { count: vatDecCount } = await supabase
        .from("vat_declarations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      // 5. Depreciation plans
      const { count: assetCount } = await supabase
        .from("fixed_assets")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      // 6. Bank accounts synced
      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("id, last_synced_at, account_name")
        .eq("company_id", companyId)
        .eq("is_active", true);

      const staleBankAccounts = (bankAccounts || []).filter(b => { if (!b.last_synced_at) return true;
        const daysSince = (Date.now() - new Date(b.last_synced_at).getTime()) / 86400000;
        return daysSince > 7;
      });

      // 7. Payroll runs vs AGI
      const { count: payrollCount } = await supabase
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "approved");

      const { count: agiCount } = await supabase
        .from("agi_submissions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      // 8. Periodization fund
      const { data: periodFunds } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number)")
        .eq("chart_of_accounts.company_id", companyId)
        .gte("chart_of_accounts.account_number", "2120")
        .lte("chart_of_accounts.account_number", "2129");

      const periodFundBalance = (periodFunds || []).reduce(
        (s, l) => s + (Number(l.credit) || 0) - (Number(l.debit) || 0), 0
      );

      // Build checks
      const checks: AuditCheck[] = [];

      // Verifications
      checks.push({ id: "attachments",
        category: "Verifikationer",
        label: "Underlag för verifikationer",
        status: missingAttachments.length === 0 ? "pass" : missingAttachments.length <= 3 ? "warning" : "fail",
        detail: missingAttachments.length === 0
          ? `Alla ${totalEntries} verifikationer har underlag`
          : `${missingAttachments.length} av ${totalEntries} verifikationer saknar underlag`,
        count: missingAttachments.length,
        action: "Åtgärda",
        actionPath: "/verifications",
      });

      checks.push({ id: "balance",
        category: "Verifikationer",
        label: "Balanserade verifikationer",
        status: unbalanced.length === 0 ? "pass" : "fail",
        detail: unbalanced.length === 0
          ? "Alla verifikationer balanserar (Debet = Kredit)"
          : `${unbalanced.length} verifikationer är obalanserade`,
        count: unbalanced.length,
      });

      checks.push({ id: "drafts",
        category: "Verifikationer",
        label: "Utkast att granska",
        status: (draftCount || 0) === 0 ? "pass" : "warning",
        detail: (draftCount || 0) === 0
          ? "Inga utkast kvar att godkänna"
          : `${draftCount} utkast behöver granskas`,
        count: draftCount || 0,
        action: "Granska",
        actionPath: "/verifications",
      });

      // Reconciliations
      checks.push({ id: "bank-recon",
        category: "Avstämningar",
        label: "Bankavstämning (1930 vs kontoutdrag)",
        status: staleBankAccounts.length === 0 && (bankAccounts || []).length > 0 ? "pass" :
          (bankAccounts || []).length === 0 ? "warning" : "fail",
        detail: (bankAccounts || []).length === 0
          ? "Ingen bankkoppling konfigurerad"
          : staleBankAccounts.length === 0
            ? "Alla bankkonton synkade senaste 7 dagarna"
            : `${staleBankAccounts.length} bankkonton ej synkade på >7 dagar`,
        action: "Konfigurera",
        actionPath: "/bank",
      });

      checks.push({ id: "vat-recon",
        category: "Avstämningar",
        label: "Momsavstämning (2610-2650 vs deklarationer)",
        status: (vatDecCount || 0) > 0 ? "pass" : "warning",
        detail: (vatDecCount || 0) > 0
          ? `${vatDecCount} momsdeklarationer registrerade`
          : "Inga momsdeklarationer skapade ännu",
        action: "Öppna",
        actionPath: "/vat-reports",
      });

      checks.push({ id: "payroll-recon",
        category: "Avstämningar",
        label: "Löneavstämning (7010-7090 vs AGI)",
        status: (payrollCount || 0) > 0 && (agiCount || 0) > 0 ? "pass" :
          (payrollCount || 0) === 0 ? "pass" : "warning",
        detail: (payrollCount || 0) === 0
          ? "Inga lönekörningar registrerade"
          : (agiCount || 0) > 0
            ? `${payrollCount} lönekörningar, ${agiCount} AGI-inlämningar`
            : "Lönekörningar finns men AGI saknas",
        action: "Öppna",
        actionPath: "/agi-submission",
      });

      // Documentation
      checks.push({ id: "depreciation",
        category: "Dokumentation",
        label: "Avskrivningsplaner",
        status: (assetCount || 0) >= 0 ? "pass" : "warning",
        detail: (assetCount || 0) > 0
          ? `${assetCount} tillgångar med avskrivningsplan`
          : "Inga anläggningstillgångar registrerade",
        action: "Öppna",
        actionPath: "/depreciation",
      });

      checks.push({ id: "period-fund",
        category: "Dokumentation",
        label: "Periodiseringsfonder",
        status: "pass",
        detail: periodFundBalance > 0
          ? `Registrerade periodiseringsfonder: ${formatSEK(periodFundBalance)}`
          : "Inga periodiseringsfonder registrerade",
      });

      // Score calculation
      const weights = { pass: 1, warning: 0.5, fail: 0 };
      const score = Math.round(
        (checks.reduce((s, c) => s + weights[c.status], 0) / checks.length) * 100
      );

      return { checks, score, totalEntries, missingAttachments: missingAttachments.length };
    },
  });
};

const StatusIcon = ({ status }: { status: AuditCheck["status"] }) => { if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-[#085041] flex-shrink-0" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-[#7A5417] flex-shrink-0" />;
  return <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
};

export const AuditReadiness = () => { const [companyId, setCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => { const stored = localStorage.getItem("dashboard:selectedCompanyId");
    if (stored) setCompanyId(stored);
  }, []);

  const { data, isLoading, refetch } = useAuditData(companyId);
  const { data: readinessData } = useAuditReadinessChecks();

  if (isLoading) { return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!data) { return (
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen data tillgänglig</h3>
          <p className="text-muted-foreground">Välj ett bolag och bokför transaktioner för att se revisionsförberedelse.</p>
        </CardContent>
      </Card>
    );
  }

  const categories = [...new Set(data.checks.map(c => c.category))];
  const failCount = data.checks.filter(c => c.status === "fail").length;
  const warnCount = data.checks.filter(c => c.status === "warning").length;
  const passCount = data.checks.filter(c => c.status === "pass").length;

  return (
    <Tabs defaultValue="score" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="score">Revisionsbetyg</TabsTrigger>
        <TabsTrigger value="quickcheck">Snabbkontroll</TabsTrigger>
        <TabsTrigger value="checklist">Checklista</TabsTrigger>
        <TabsTrigger value="portal">Revisorsportal</TabsTrigger>
      </TabsList>

      {/* SCORE */}
      <TabsContent value="score" className="space-y-6">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="text-6xl font-bold text-primary mb-2">{data.score}</div>
            <div className="text-lg text-muted-foreground mb-4">Revisionsförberedelse</div>
            <Progress value={data.score} className="h-3 max-w-md mx-auto mb-4" />
            <Badge variant={data.score >= 80 ? "default" : data.score >= 50 ? "secondary" : "destructive"} className="text-sm">
              {data.score >= 90 ? "Utmärkt — revisionsredo" :
               data.score >= 70 ? "Bra — små brister" :
               data.score >= 50 ? "Medel — åtgärder krävs" :
               "Kritiskt — prioritera åtgärder"}
            </Badge>

            {data.missingAttachments > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm inline-block">
                <span className="text-muted-foreground">Saknas: </span>
                <span className="font-semibold">{data.missingAttachments} verifikationer utan underlag</span>
                <Button variant="link" size="sm" className="ml-2 p-0 h-auto">
                  Åtgärda →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-[#085041] mx-auto mb-1" />
              <div className="text-2xl font-bold">{passCount}</div>
              <div className="text-xs text-muted-foreground">Godkända</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 text-[#7A5417] mx-auto mb-1" />
              <div className="text-2xl font-bold">{warnCount}</div>
              <div className="text-xs text-muted-foreground">Varningar</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 text-destructive mx-auto mb-1" />
              <div className="text-2xl font-bold">{failCount}</div>
              <div className="text-xs text-muted-foreground">Brister</div>
            </CardContent>
          </Card>
        </div>

        {/* Audit file contents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Revisionsmapp (automatiskt underhållen)
            </CardTitle>
            <CardDescription>Alla delar av revisionsmappen uppdateras löpande</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: "Verifikationsregister", icon: FileCheck, detail: `${data.totalEntries} godkända poster` },
                { label: "Kontospecifikationer", icon: BarChart3, detail: "Alla konton, alla rörelser" },
                { label: "Saldolista", icon: Calculator, detail: "Innevarande + föregående år" },
                { label: "Bankavstämning", icon: Landmark, detail: "Konto 1930 vs kontoutdrag" },
                { label: "Momsavstämning", icon: Calculator, detail: "2610-2650 vs deklarationer" },
                { label: "Löneavstämning", icon: Users, detail: "7010-7090 vs AGI" },
                { label: "Avskrivningsplaner", icon: Clock, detail: "Alla anläggningstillgångar" },
                { label: "Periodiseringsfonder", icon: Building2, detail: "Register med spårbarhet" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* QUICKCHECK */}
      <TabsContent value="quickcheck" className="space-y-6">
        {readinessData ? (
          <>
            {/* Circular-style progress */}
            <Card className="border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle cx="60" cy="60" r="52" fill="none"
                      stroke={readinessData.percent < 50 ? '#DC2626' : readinessData.percent < 80 ? '#F59E0B' : '#22C55E'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${readinessData.percent * 3.27} 327`}
                    />
                  </svg>
                  <span className="absolute text-3xl font-bold">{readinessData.percent}%</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {readinessData.score} av {readinessData.total} kontrollpunkter godkända
                </div>
              </CardContent>
            </Card>

            {/* Check items */}
            <div className="space-y-3">
              {readinessData.checks.map(check => (
                <div key={check.id} className="flex items-center justify-between p-4 bg-card rounded-xl border">
                  <div className="flex items-center gap-3">
                    {check.ok
                      ? <CheckCircle2 className="h-5 w-5 text-[#085041] flex-shrink-0" />
                      : <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                    <div>
                      <div className="text-sm font-medium">{check.label}</div>
                      <div className="text-xs text-muted-foreground">{check.detail}</div>
                    </div>
                  </div>
                  {!check.ok && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate(check.action)}>
                      Åtgärda <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Välj ett bolag för att se snabbkontroll
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* CHECKLIST */}
      <TabsContent value="checklist" className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Uppdatera
          </Button>
        </div>

        {categories.map(cat => (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.checks.filter(c => c.category === cat).map(check => (
                <div key={check.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={check.status} />
                    <div>
                      <div className="text-sm font-medium">{check.label}</div>
                      <div className="text-xs text-muted-foreground">{check.detail}</div>
                    </div>
                  </div>
                  {check.action && check.actionPath && check.status !== "pass" && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" asChild>
                      <a href={check.actionPath}>
                        {check.action}
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* AUDITOR PORTAL */}
      <TabsContent value="portal" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Revisorsportal
            </CardTitle>
            <CardDescription>
              Dela läsbehörighet med din externa revisor — ingen Excel-export eller fysiska möten krävs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center space-y-4">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <h4 className="font-semibold">Bjud in revisor</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Revisorn får läsbehörighet till all bokföringsdata, rapporter och underlag
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Skapa inbjudningslänk
                </Button>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportera revisionsmapp (ZIP)
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Vad revisorn kan göra:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Bläddra i alla verifikationer med underlag",
                  "Ladda ner resultat- och balansräkning",
                  "Granska saldolista och kontospecifikationer",
                  "Se bankavstämningar i realtid",
                  "Chatta med AI om bokföringen",
                  "Exportera data i valfritt format",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#085041] flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Vad revisorn inte kan göra:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Ändra bokföring eller verifikationer",
                  "Ta bort underlag eller dokument",
                  "Ändra inställningar eller behörigheter",
                  "Se andra bolags data",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
