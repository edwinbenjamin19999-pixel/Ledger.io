import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, CheckCircle2, AlertTriangle, BarChart3, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { runConsolidationEngine, formatSEK, RR_SECTIONS, BR_ASSET_SECTIONS, BR_EQUITY_SECTIONS, BR_LIABILITY_SECTIONS, type ConsolidationKPIs, type BRValidation } from "@/lib/consolidation-engine";
import { ConsolidationKPIPanel } from "@/components/consolidation/ConsolidationKPIPanel";
import { cn } from "@/lib/utils";
import type { JournalEntryJoin } from "@/types/database-extensions";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface Company { id: string; name: string; }
interface ReportLine { account_no: string; account_name: string; entity_amounts: Record<string, number>;
  raw_total: number; elimination: number; consolidated: number;
  is_section: boolean; is_total: boolean; is_grand_total: boolean; is_result: boolean; indent: number;
}
interface Stage5Props { groupId: string; periodId: string; onComplete: () => void; }

export const Stage5Report = ({ groupId, periodId, onComplete }: Stage5Props) => { const [companies, setCompanies] = useState<Company[]>([]);
  const [rrLines, setRrLines] = useState<ReportLine[]>([]);
  const [brLines, setBrLines] = useState<ReportLine[]>([]);
  const [kpis, setKpis] = useState<ConsolidationKPIs | null>(null);
  const [brValidation, setBrValidation] = useState<BRValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccounts, setShowAccounts] = useState(true);
  const [activeTab, setActiveTab] = useState("rr");
  const [drilldown, setDrilldown] = useState<{ entityId: string; accountNo: string } | null>(null);

  useEffect(() => { generateReport(); }, [groupId, periodId]);

  const generateReport = async () => { setIsLoading(true);
    try { const [compRes, balRes, elimRes] = await Promise.all([
        supabase.from("companies").select("id, name").eq("group_id", groupId).order("name"),
        supabase.from("entity_trial_balances").select("*").eq("consolidation_period_id", periodId),
        supabase.from("consolidation_elimination_entries")
          .select("*, lines:consolidation_elimination_lines(*)").eq("consolidation_period_id", periodId).eq("status", "approved"),
      ]);
      const comps = compRes.data || [];
      let balances = balRes.data || [];
      const eliminations = elimRes.data || [];
      setCompanies(comps);

      // Fallback: if no trial balances, build from journal_entry_lines
      if (balances.length === 0 && comps.length > 0) { const companyIds = comps.map(c => c.id);
        const { data: journalData } = await supabase
          .from("journal_entry_lines")
          .select("debit, credit, account_id, journal_entries!inner(company_id, entry_date, status)")
          .in("journal_entries.company_id", companyIds)
          .eq("journal_entries.status", "approved");

        if (journalData && journalData.length > 0) { // Fetch chart of accounts för these companies
          const { data: accountsData } = await supabase
            .from("chart_of_accounts")
            .select("id, account_number, account_name")
            .in("company_id", companyIds);

          const accountMap = new Map((accountsData || []).map(a => [a.id, a]));

          // Aggregate by company + account
          const aggMap = new Map<string, { entity_id: string; account_no: string; account_name: string; debit: number; credit: number }>();
          for (const line of journalData) { const je = line.journal_entries as JournalEntryJoin | null;
            const acc = accountMap.get(line.account_id);
            if (!acc || !je) continue;
            const key = `${je.company_id}:${acc.account_number}`;
            const existing = aggMap.get(key);
            if (existing) { existing.debit += line.debit || 0;
              existing.credit += line.credit || 0;
            } else { aggMap.set(key, { entity_id: je.company_id,
                account_no: acc.account_number,
                account_name: acc.account_name,
                debit: line.debit || 0,
                credit: line.credit || 0,
              });
            }
          }

          // Convert to trial balance format
          balances = Array.from(aggMap.values()).map(a => ({ entity_id: a.entity_id,
            account_no: a.account_no,
            account_name: a.account_name,
            debit: a.debit,
            credit: a.credit,
            closing_balance: a.debit - a.credit,
            // Fill other required fields with defaults
            id: '',
            consolidation_period_id: periodId,
            currency: 'SEK',
            import_source: 'journal',
            imported_at: new Date().toISOString(),
            opening_balance: 0,
            created_at: new Date().toISOString(),
            translated_sek_amount: null,
            translation_rate_type: null,
          }));
        }
      }

      const elimLines: { account_no: string; debit: number; credit: number }[] = [];
      eliminations.forEach((e: any) => { (e.lines || []).forEach((line: any) => { elimLines.push({ account_no: line.account_no, debit: line.debit || 0, credit: line.credit || 0 }); }); });

      const entityBalances = balances.map((b: any) => ({ entity_id: b.entity_id, entity_name: comps.find((c: any) => c.id === b.entity_id)?.name || "",
        account_no: b.account_no, account_name: b.account_name, debit: b.debit, credit: b.credit, closing_balance: b.closing_balance,
      }));

      const result = runConsolidationEngine(entityBalances, elimLines, comps);
      setKpis(result.kpis);
      setBrValidation(result.brValidation);

      const buildLines = (sections: { key: string; label: string; range: string[]; resultLabel?: string }[], grandLabel: string, isResultRow = false): ReportLine[] => { const lines: ReportLine[] = [];
        let gT = 0, gE = 0, gR = 0;
        const gEnt: Record<string, number> = {};
        for (const section of sections) { lines.push(emptyLine(section.label, true));
          let sT = 0, sE = 0, sR = 0;
          const sEnt: Record<string, number> = {};
          const accs = Array.from(result.accounts.entries()).filter(([no]) => section.range.some(r => no.startsWith(r))).sort(([a], [b]) => a.localeCompare(b));
          for (const [, acc] of accs) { lines.push({ account_no: acc.account_no, account_name: acc.account_name, entity_amounts: acc.entity_amounts, raw_total: acc.raw_total, elimination: acc.elimination, consolidated: acc.consolidated, is_section: false, is_total: false, is_grand_total: false, is_result: false, indent: 1 });
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
      setBrLines([emptyLine("TILLGÅNGAR", true), ...aL, emptyLine("", false), emptyLine("EGET KAPITAL OCH SKULDER", true), ...eL, emptyLine("", false), ...lL,
        { account_no: "", account_name: "SUMMA EGET KAPITAL OCH SKULDER", entity_amounts: {}, raw_total: 0, elimination: 0, consolidated: tEq + tLi, is_section: false, is_total: false, is_grand_total: true, is_result: false, indent: 0 }]);
    } catch (err: any) { toast.error(err.message || "Kunde inte generera rapport"); } finally { setIsLoading(false); }
  };

  const emptyLine = (label: string, isSection: boolean): ReportLine => ({ account_no: "", account_name: label, entity_amounts: {}, raw_total: 0, elimination: 0, consolidated: 0, is_section: isSection, is_total: false, is_grand_total: false, is_result: false, indent: 0 });

  const renderMatrix = (lines: ReportLine[]) => (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="konc-matrix w-full">
          <thead><tr>
            <th className="text-left w-[50px]">Konto</th>
            <th className="text-left min-w-[170px]">Benämning</th>
            {companies.map((c, i) => (<th key={c.id} className="text-right min-w-[100px]"><span className={`entity-dot entity-dot-${i % 8}`} />{c.name}</th>))}
            <th className="text-right min-w-[90px]">Summa</th>
            <th className="text-right min-w-[90px]">Elim.</th>
            <th className="text-right min-w-[110px] font-bold">Koncern</th>
          </tr></thead>
          <tbody>
            {lines.map((line, i) => { if (!line.account_name && !line.account_no) return <tr key={i}><td colSpan={companies.length + 5} className="h-3" /></tr>;
              if (!showAccounts && !line.is_section && !line.is_total && !line.is_grand_total && !line.is_result) return null;
              const rowClass = line.is_result ? "result-row" : line.is_section ? "section-header" : line.is_grand_total ? "grand-total-row" : line.is_total ? "subtotal-row" : "";
              return (
                <tr key={i} className={rowClass}>
                  <td className="text-muted-foreground text-[11px]">{line.account_no}</td>
                  <td style={{ paddingLeft: line.indent ? `${line.indent * 16 + 12}px` : undefined }}>{line.account_name}</td>
                  {companies.map(c => { const amt = line.entity_amounts[c.id] || 0; return (
                    <td key={c.id} className={cn("text-right", !line.is_section && "cursor-pointer hover:bg-accent/10")} onClick={() => line.account_no && setDrilldown({ entityId: c.id, accountNo: line.account_no })}>
                      {line.is_section ? "" : <span className={cn(amt < -0.5 && "konc-negative", Math.abs(amt) < 0.5 && "konc-zero")}>{formatSEK(amt)}</span>}
                    </td>); })}
                  <td className="text-right">{line.is_section ? "" : formatSEK(line.raw_total)}</td>
                  <td className="text-right">{line.is_section || line.elimination === 0 ? "" : <span className="konc-elimination">{formatSEK(-line.elimination)}</span>}</td>
                  <td className={cn("text-right", (line.is_total || line.is_grand_total) && "font-semibold", line.is_result && "font-bold")}>{line.is_section ? "" : formatSEK(line.consolidated)}</td>
                </tr>);
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  if (isLoading) return (<div className="space-y-4"><div className="grid grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-[400px]" /></div>);

  return (
    <div className="space-y-6">
      {kpis && <ConsolidationKPIPanel kpis={kpis} />}
      {brValidation && (
        <Alert className={brValidation.isBalanced ? "border-[hsl(var(--status-green))]/30 bg-[hsl(var(--status-green-bg))]" : "border-destructive/30"}>
          {brValidation.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <AlertDescription className="flex items-center justify-between text-sm">
            <span>{brValidation.isBalanced ? "Balansräkningen balanserar ✓" : "⚠ Balansräkningen balanserar inte"}</span>
            <span className="tabular-nums text-xs font-mono">Diff: {formatSEK(brValidation.difference)} kr</span>
          </AlertDescription>
        </Alert>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <TabsList><TabsTrigger value="rr">Resultaträkning</TabsTrigger><TabsTrigger value="br">Balansräkning</TabsTrigger><TabsTrigger value="compare">Enhetsjämförelse</TabsTrigger></TabsList>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAccounts(!showAccounts)} className="text-xs gap-1.5">{showAccounts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{showAccounts ? "Dölj konton" : "Visa konton"}</Button>
            <ComingSoonButton tooltipText="Excel-export lanseras snart">Excel</ComingSoonButton>
            <ComingSoonButton tooltipText="PDF-export lanseras snart">PDF</ComingSoonButton>
          </div>
        </div>
        <TabsContent value="rr">{renderMatrix(rrLines)}</TabsContent>
        <TabsContent value="br">
          {renderMatrix(brLines)}
          {brValidation && (<Card className="mt-4"><CardContent className="py-4"><div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Summa tillgångar</div><div className="text-lg font-bold tabular-nums">{formatSEK(brValidation.totalAssets)} kr</div></div>
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Summa EK + skulder</div><div className="text-lg font-bold tabular-nums">{formatSEK(brValidation.totalEquityAndLiabilities)} kr</div></div>
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Differens</div><div className={cn("text-lg font-bold tabular-nums", brValidation.isBalanced ? "text-[hsl(var(--status-green))]" : "text-destructive")}>{formatSEK(brValidation.difference)} kr {brValidation.isBalanced ? "✓" : "✗"}</div></div>
          </div></CardContent></Card>)}
        </TabsContent>
        <TabsContent value="compare">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-5 h-5 text-accent" />Enhetsjämförelse</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="konc-matrix w-full"><thead><tr><th className="text-left">Post</th>{companies.map((c, i) => <th key={c.id} className="text-right"><span className={`entity-dot entity-dot-${i % 8}`} />{c.name}</th>)}<th className="text-right font-bold">Koncern</th></tr></thead>
                <tbody>{rrLines.filter(l => l.is_total || l.is_grand_total).map((line, i) => (
                  <tr key={i} className={line.is_grand_total ? "grand-total-row" : "subtotal-row"}>
                    <td>{line.account_name}</td>
                    {companies.map(c => { const amt = line.entity_amounts[c.id] || 0; const pct = line.consolidated !== 0 ? (amt / line.consolidated) * 100 : 0; return <td key={c.id} className="text-right"><div className="tabular-nums">{formatSEK(amt)}</div><div className="text-[11px] text-muted-foreground">{isFinite(pct) ? `${pct.toFixed(0)}%` : ""}</div></td>; })}
                    <td className="text-right font-bold tabular-nums">{formatSEK(line.consolidated)} kr</td>
                  </tr>))}</tbody></table>
            </CardContent></Card>
        </TabsContent>
      </Tabs>
      <div className={cn("konc-drilldown", drilldown && "open")}>{drilldown && (<div className="p-6"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-sm">Konto {drilldown.accountNo}</h3><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDrilldown(null)}><X className="w-4 h-4" /></Button></div><p className="text-xs text-muted-foreground">{companies.find(c => c.id === drilldown.entityId)?.name}</p><div className="mt-4 pt-4 border-t text-xs text-muted-foreground">Transaktionsdetaljer visas här.</div></div>)}</div>
      <div className="flex justify-end"><Button onClick={onComplete}>Gå vidare till Koncernårsredovisning →</Button></div>
    </div>
  );
};
