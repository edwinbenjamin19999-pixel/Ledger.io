import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, EyeOff, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { runConsolidationEngine, formatSEK,
  RR_SECTIONS, BR_ASSET_SECTIONS, BR_EQUITY_SECTIONS, BR_LIABILITY_SECTIONS,
  type ConsolidationKPIs, type BRValidation
} from "@/lib/consolidation-engine";
import { ConsolidationKPIPanel } from "@/components/consolidation/ConsolidationKPIPanel";
import { cn } from "@/lib/utils";
import type { ChartOfAccountsJoin } from "@/types/database-extensions";

interface KoncernrapportTabProps {
  groupId: string;
  periodId: string;
  groupName: string;
  currency: string;
}

interface Company { id: string; name: string; }
interface ReportLine {
  account_no: string; account_name: string; entity_amounts: Record<string, number>;
  raw_total: number; elimination: number; consolidated: number;
  is_section: boolean; is_total: boolean; is_grand_total: boolean; is_result: boolean; indent: number;
}

export const KoncernrapportTab = ({ groupId, periodId, groupName, currency }: KoncernrapportTabProps) => {
  const [subTab, setSubTab] = useState("tabla");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rrLines, setRrLines] = useState<ReportLine[]>([]);
  const [brLines, setBrLines] = useState<ReportLine[]>([]);
  const [kpis, setKpis] = useState<ConsolidationKPIs | null>(null);
  const [brValidation, setBrValidation] = useState<BRValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccounts, setShowAccounts] = useState(true);
  const [viewMode, setViewMode] = useState<"standard" | "bidrag" | "ksek">("standard");

  useEffect(() => {
    if (groupId && periodId) generateReport();
  }, [groupId, periodId]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const [compRes, balRes, elimRes] = await Promise.all([
        supabase.from("companies").select("id, name").eq("group_id", groupId).order("name"),
        supabase.from("entity_trial_balances").select("*").eq("consolidation_period_id", periodId),
        supabase.from("consolidation_elimination_entries")
          .select("*, lines:consolidation_elimination_lines(*)").eq("consolidation_period_id", periodId).eq("status", "approved"),
      ]);
      const comps = compRes.data || [];
      let balances = balRes.data || [];
      const eliminations = elimRes.data || [];
      setCompanies(comps);

      // Fallback: build from journal_entry_lines
      if (balances.length === 0 && comps.length > 0) {
        const companyIds = comps.map((c) => c.id);
        const { data: jeData } = await supabase
          .from("journal_entries")
          .select("id, company_id, journal_entry_lines(*, chart_of_accounts(account_number, account_name))")
          .in("company_id", companyIds)
          .eq("status", "approved");

        const aggMap = new Map<string, { entity_id: string; account_no: string; account_name: string; debit: number; credit: number }>();
        for (const je of jeData || []) {
          for (const line of (je as unknown as { journal_entry_lines: Record<string, unknown>[] }).journal_entry_lines || []) {
            const acc = line.chart_of_accounts as ChartOfAccountsJoin | null;
            if (!acc) continue;
            const key = `${je.company_id}_${acc.account_number}`;
            const existing = aggMap.get(key) || { entity_id: je.company_id, account_no: acc.account_number, account_name: acc.account_name, debit: 0, credit: 0 };
            existing.debit += Number(line.debit) || 0;
            existing.credit += Number(line.credit) || 0;
            aggMap.set(key, existing);
          }
        }
        balances = Array.from(aggMap.values()).map((a) => ({
          entity_id: a.entity_id, account_no: a.account_no, account_name: a.account_name,
          debit: a.debit, credit: a.credit, closing_balance: a.debit - a.credit,
          id: '', consolidation_period_id: periodId, currency: 'SEK',
          import_source: 'journal', imported_at: new Date().toISOString(),
          opening_balance: 0, created_at: new Date().toISOString(),
          translated_sek_amount: null, translation_rate_type: null,
        }));
      }

      const elimLines: { account_no: string; debit: number; credit: number }[] = [];
      eliminations.forEach((e: Record<string, unknown>) => {
        ((e.lines as Record<string, unknown>[]) || []).forEach((line: Record<string, unknown>) => {
          elimLines.push({ account_no: line.account_no as string, debit: Number(line.debit) || 0, credit: Number(line.credit) || 0 });
        });
      });

      const entityBalances = balances.map((b: Record<string, unknown>) => ({
        entity_id: b.entity_id as string,
        entity_name: comps.find((c) => c.id === b.entity_id)?.name || "",
        account_no: b.account_no as string,
        account_name: b.account_name as string,
        debit: b.debit as number,
        credit: b.credit as number,
        closing_balance: b.closing_balance as number,
      }));

      const result = runConsolidationEngine(entityBalances, elimLines, comps);
      setKpis(result.kpis);
      setBrValidation(result.brValidation);

      const buildLines = (sections: { key: string; label: string; range: string[]; resultLabel?: string }[], grandLabel: string, isResultRow = false): ReportLine[] => {
        const lines: ReportLine[] = [];
        let gT = 0, gE = 0, gR = 0;
        const gEnt: Record<string, number> = {};
        for (const section of sections) {
          lines.push(emptyLine(section.label, true));
          let sT = 0, sE = 0, sR = 0;
          const sEnt: Record<string, number> = {};
          const accs = Array.from(result.accounts.entries()).filter(([no]) => section.range.some((r) => no.startsWith(r))).sort(([a], [b]) => a.localeCompare(b));
          for (const [, acc] of accs) {
            lines.push({ account_no: acc.account_no, account_name: acc.account_name, entity_amounts: acc.entity_amounts, raw_total: acc.raw_total, elimination: acc.elimination, consolidated: acc.consolidated, is_section: false, is_total: false, is_grand_total: false, is_result: false, indent: 1 });
            sT += acc.consolidated; sE += acc.elimination; sR += acc.raw_total;
            for (const [eid, amt] of Object.entries(acc.entity_amounts)) sEnt[eid] = (sEnt[eid] || 0) + amt;
          }
          lines.push({ account_no: "", account_name: section.resultLabel || `Summa ${section.label.toLowerCase()}`, entity_amounts: sEnt, raw_total: sR, elimination: sE, consolidated: sT, is_section: false, is_total: true, is_grand_total: false, is_result: false, indent: 0 });
          gT += sT; gE += sE; gR += sR;
          for (const [eid, amt] of Object.entries(sEnt)) gEnt[eid] = (gEnt[eid] || 0) + amt;
        }
        lines.push({ account_no: "", account_name: grandLabel, entity_amounts: gEnt, raw_total: gR, elimination: gE, consolidated: gT, is_section: false, is_total: false, is_grand_total: true, is_result: isResultRow, indent: 0 });
        return lines;
      };

      setRrLines(buildLines(RR_SECTIONS, "ÅRETS RESULTAT", true));
      const aL = buildLines(BR_ASSET_SECTIONS, "SUMMA TILLGÅNGAR");
      const eL = buildLines(BR_EQUITY_SECTIONS, "Summa eget kapital");
      const lL = buildLines(BR_LIABILITY_SECTIONS, "Summa skulder");
      const tEq = eL[eL.length - 1]?.consolidated || 0;
      const tLi = lL[lL.length - 1]?.consolidated || 0;
      setBrLines([
        emptyLine("TILLGÅNGAR", true), ...aL,
        emptyLine("", false),
        emptyLine("EGET KAPITAL OCH SKULDER", true), ...eL,
        emptyLine("", false), ...lL,
        { account_no: "", account_name: "SUMMA EGET KAPITAL OCH SKULDER", entity_amounts: {}, raw_total: 0, elimination: 0, consolidated: tEq + tLi, is_section: false, is_total: false, is_grand_total: true, is_result: false, indent: 0 }
      ]);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Kunde inte generera rapport");
    } finally {
      setIsLoading(false);
    }
  };

  const emptyLine = (label: string, isSection: boolean): ReportLine => ({
    account_no: "", account_name: label, entity_amounts: {}, raw_total: 0, elimination: 0, consolidated: 0, is_section: isSection, is_total: false, is_grand_total: false, is_result: false, indent: 0
  });

  const formatValue = (n: number): string => {
    if (viewMode === "ksek") {
      if (Math.abs(n) < 0.5) return "—";
      return (n / 1000).toFixed(1);
    }
    return formatSEK(n);
  };

  const renderMatrix = (lines: ReportLine[]) => (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="konc-matrix w-full">
          <thead><tr>
            <th className="text-left w-[50px]">Konto</th>
            <th className="text-left min-w-[170px]">Benämning</th>
            {viewMode === "bidrag" ? (
              <>
                <th className="text-right min-w-[110px] font-bold">Koncern</th>
                {companies.map((c, i) => (
                  <th key={c.id} className="text-right min-w-[140px]">
                    <span className={`entity-dot entity-dot-${i % 8}`} />{c.name} (kr / %)
                  </th>
                ))}
              </>
            ) : (
              <>
                {companies.map((c, i) => (
                  <th key={c.id} className="text-right min-w-[100px]">
                    <span className={`entity-dot entity-dot-${i % 8}`} />{c.name}
                  </th>
                ))}
                <th className="text-right min-w-[90px]">Summa</th>
                <th className="text-right min-w-[90px] italic text-muted-foreground">Elim.</th>
                <th className="text-right min-w-[110px] font-bold">Koncern</th>
              </>
            )}
          </tr></thead>
          <tbody>
            {lines.map((line, i) => {
              if (!line.account_name && !line.account_no) return <tr key={i}><td colSpan={companies.length + 5} className="h-3" /></tr>;
              if (!showAccounts && !line.is_section && !line.is_total && !line.is_grand_total && !line.is_result) return null;
              const rowClass = line.is_result ? "result-row" : line.is_section ? "section-header" : line.is_grand_total ? "grand-total-row" : line.is_total ? "subtotal-row" : "";
              return (
                <tr key={i} className={cn(rowClass, "group")}>
                  <td className="text-muted-foreground text-[11px]">{line.account_no}</td>
                  <td style={{ paddingLeft: line.indent ? `${line.indent * 16 + 12}px` : undefined }}>{line.account_name}</td>
                  {viewMode === "bidrag" ? (
                    <>
                      <td className={cn("text-right font-semibold", (line.is_total || line.is_grand_total) && "font-bold")}>
                        {line.is_section ? "" : formatValue(line.consolidated)}
                      </td>
                      {companies.map((c) => {
                        const amt = line.entity_amounts[c.id] || 0;
                        const pct = line.consolidated !== 0 ? (amt / line.consolidated) * 100 : 0;
                        return (
                          <td key={c.id} className="text-right">
                            {line.is_section ? "" : (
                              <span className="text-xs">
                                <span className={cn(amt < -0.5 && "konc-negative")}>{formatValue(amt)}</span>
                                {Math.abs(line.consolidated) > 0.5 && <span className="text-muted-foreground ml-1">({Math.abs(pct).toFixed(0)}%)</span>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {companies.map((c) => {
                        const amt = line.entity_amounts[c.id] || 0;
                        return (
                          <td key={c.id} className={cn("text-right", !line.is_section && "cursor-pointer hover:bg-accent/10")}>
                            {line.is_section ? "" : <span className={cn(amt < -0.5 && "konc-negative", Math.abs(amt) < 0.5 && "konc-zero")}>{formatValue(amt)}</span>}
                          </td>
                        );
                      })}
                      <td className="text-right">{line.is_section ? "" : formatValue(line.raw_total)}</td>
                      <td className="text-right italic">{line.is_section || line.elimination === 0 ? "" : <span className="konc-elimination">{formatValue(-line.elimination)}</span>}</td>
                      <td className={cn("text-right", (line.is_total || line.is_grand_total) && "font-semibold", line.is_result && "font-bold")}>
                        {line.is_section ? "" : formatValue(line.consolidated)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  if (isLoading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-[400px]" />
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <div className="flex items-center justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="tabla" className="text-xs">Koncerntablå</TabsTrigger>
            <TabsTrigger value="rr" className="text-xs">Resultaträkning</TabsTrigger>
            <TabsTrigger value="br" className="text-xs">Balansräkning</TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs">Kassaflöde</TabsTrigger>
            <TabsTrigger value="ek" className="text-xs">Eget kapital</TabsTrigger>
            <TabsTrigger value="segment" className="text-xs">Segment</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-input overflow-hidden">
              {([["standard", "Standard"], ["bidrag", "Bidrag"], ["ksek", "KSEK"]] as const).map(([key, label]) => (
                <button key={key} className={cn("px-2.5 py-1 text-[11px] font-medium transition-colors", viewMode === key ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")} onClick={() => setViewMode(key)}>
                  {label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAccounts(!showAccounts)}>
              {showAccounts ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
              {showAccounts ? "Dölj" : "Visa"}
            </Button>
            <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
            <Button size="sm"><Download className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
          </div>
        </div>

        <div className="mt-4">
          {kpis && <div className="mb-4"><ConsolidationKPIPanel kpis={kpis} /></div>}

          {brValidation && (
            <Alert className={cn("mb-4", brValidation.isBalanced ? "border-[hsl(var(--status-green))]/30 bg-[hsl(var(--status-green-bg))]" : "border-destructive/30 bg-destructive/5")}>
              <AlertDescription className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {brValidation.isBalanced ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--status-green))]" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
                  {brValidation.isBalanced ? "Balansräkningen balanserar ✓" : "Balansräkningen balanserar inte"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    T: {formatSEK(brValidation.totalAssets)} | EK+S: {formatSEK(brValidation.totalEquityAndLiabilities)} | Diff: {formatSEK(brValidation.difference)} kr
                  </span>
                  {!brValidation.isBalanced && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toast.info("Årets resultat har redan injicerats automatiskt till konto 2099")}>
                      <Wrench className="w-3 h-3 mr-1" />Diagnostik
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <TabsContent value="tabla">{renderMatrix([...rrLines, emptyLine("", false), ...brLines])}</TabsContent>
          <TabsContent value="rr">{renderMatrix(rrLines)}</TabsContent>
          <TabsContent value="br">{renderMatrix(brLines)}</TabsContent>

          <TabsContent value="cashflow">
            <CashFlowStatement kpis={kpis} />
          </TabsContent>

          <TabsContent value="ek">
            <EquityChanges kpis={kpis} />
          </TabsContent>

          <TabsContent value="segment">
            <Card><CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">Segmentrapportering — Lägg till segment via koncernhantering</p>
            </CardContent></Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// ─── Kassaflödesanalys (Indirekt metod, enhanced) ───
const CashFlowStatement = ({ kpis }: { kpis: ConsolidationKPIs | null }) => {
  if (!kpis) return null;

  const sections = [
    { title: "Rörelseverksamheten",
      items: [
        { label: "Årets resultat", value: kpis.netIncome },
        { label: "Återläggning avskrivningar", value: 0, note: "Konto 78xx" },
        { label: "Återläggning goodwillavskrivning", value: 0, note: "Konsoliderad goodwill" },
        { label: "Förändring varulager", value: 0, note: "Klass 14xx" },
        { label: "Förändring kundfordringar", value: 0, note: "Klass 15xx" },
        { label: "Förändring leverantörsskulder", value: 0, note: "Klass 24xx" },
        { label: "Förändring övriga rörelsefordringar", value: 0 },
        { label: "Betald skatt", value: 0, note: "Konto 2510" },
      ],
    },
    { title: "Investeringsverksamheten",
      items: [
        { label: "Förvärv av dotterföretag", value: 0 },
        { label: "Investering materiella anläggningstillgångar", value: 0 },
        { label: "Försäljning materiella anläggningstillgångar", value: 0 },
      ],
    },
    { title: "Finansieringsverksamheten",
      items: [
        { label: "Nyemission", value: 0 },
        { label: "Upptagna lån", value: 0 },
        { label: "Amortering lån", value: 0 },
        { label: "Utdelning", value: 0 },
      ],
    },
  ];

  let cashAtStart = 0;
  let runningTotal = 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Kassaflödesanalys — Indirekt metod</h3>
            <p className="text-xs text-muted-foreground">Enligt K3 kapitel 7</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
            <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {sections.map((section) => {
              const sectionTotal = section.items.reduce((s, i) => s + i.value, 0);
              runningTotal += sectionTotal;
              return (
                <React.Fragment key={section.title}>
                  <tr><td colSpan={2} className="font-bold text-[11px] uppercase tracking-wider pt-5 pb-2 border-t text-muted-foreground">{section.title}</td></tr>
                  {section.items.map((item) => (
                    <tr key={item.label} className="hover:bg-muted/30 group">
                      <td className="py-1.5 pl-4">{item.label}</td>
                      <td className={cn("py-1.5 text-right tabular-nums w-32", item.value < 0 && "text-destructive", item.value > 0 && "text-[hsl(var(--status-green))]")}>
                        {item.value === 0 ? "—" : formatSEK(item.value)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold border-t">
                    <td className="py-2.5">Kassaflöde från {section.title.toLowerCase()}</td>
                    <td className={cn("py-2.5 text-right tabular-nums", sectionTotal < 0 && "text-destructive")}>{formatSEK(sectionTotal)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="font-bold border-t-2 border-foreground/20">
              <td className="py-3">Årets kassaflöde</td>
              <td className={cn("py-3 text-right tabular-nums text-base", runningTotal < 0 && "text-destructive")}>{formatSEK(runningTotal)}</td>
            </tr>
            <tr className="text-muted-foreground">
              <td className="py-1.5">Kassa vid årets början</td>
              <td className="py-1.5 text-right tabular-nums">{formatSEK(cashAtStart)}</td>
            </tr>
            <tr className="font-bold border-t">
              <td className="py-2.5">Kassa vid årets slut</td>
              <td className={cn("py-2.5 text-right tabular-nums text-base")}>{formatSEK(cashAtStart + runningTotal)}</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

// ─── Förändringar i Eget Kapital ───
const EquityChanges = ({ kpis }: { kpis: ConsolidationKPIs | null }) => {
  if (!kpis) return null;

  const cols = ["IB", "Nyemission", "Utdelning", "Omräkn.diff", "Övrigt totalresultat", "Årets resultat", "UB"];
  const rows = [
    { label: "Aktiekapital", values: [0, 0, 0, 0, 0, 0, 0] },
    { label: "Överkursfond", values: [0, 0, 0, 0, 0, 0, 0] },
    { label: "Reserver", values: [0, 0, 0, 0, 0, 0, 0] },
    { label: "Omräkningsdifferenser", values: [0, 0, 0, 0, 0, 0, 0] },
    { label: "Balanserade vinstmedel", values: [0, 0, 0, 0, 0, 0, 0] },
    { label: "Årets resultat", values: [0, 0, 0, 0, 0, kpis.netIncome, kpis.netIncome] },
  ];

  const totals = cols.map((_, ci) => rows.reduce((s, r) => s + r.values[ci], 0));

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Förändringar i eget kapital</h3>
            <p className="text-xs text-muted-foreground">Enligt ÅRL</p>
          </div>
          <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left pb-2 pr-4"></th>
                {cols.map((c) => <th key={c} className="text-right pb-2 px-3 w-24">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-4 font-medium">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={cn("py-2 px-3 text-right tabular-nums", v < -0.5 && "text-destructive")}>
                      {Math.abs(v) < 0.5 ? "—" : formatSEK(v)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-bold border-t-2">
                <td className="py-2.5 pr-4">TOTALT EGET KAPITAL</td>
                {totals.map((v, i) => (
                  <td key={i} className={cn("py-2.5 px-3 text-right tabular-nums", v < -0.5 && "text-destructive")}>
                    {Math.abs(v) < 0.5 ? "—" : formatSEK(v)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
