import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckCircle2, AlertTriangle, Circle, ArrowRight, Shield, Users, Search, Settings, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

import { ConsolidationStepper } from "@/components/consolidation/ConsolidationStepper";
import { Stage1Structure } from "@/components/consolidation/stages/Stage1Structure";
import { Stage2DataCollection } from "@/components/consolidation/stages/Stage2DataCollection";
import { Stage3Adjustments } from "@/components/consolidation/stages/Stage3Adjustments";
import { Stage4Eliminations } from "@/components/consolidation/stages/Stage4Eliminations";
import { Stage5Report } from "@/components/consolidation/stages/Stage5Report";
import { Stage6AnnualReport } from "@/components/consolidation/stages/Stage6AnnualReport";

interface KonsolideringTabProps { groupId: string;
  periodId: string;
  groupName: string;
  periodStart: string;
  periodEnd: string;
}

const SUB_TABS = [
  { value: "stepper", label: "Arbetsflöde", icon: ArrowRight },
  { value: "motparter", label: "Motparter", icon: Users },
  { value: "goodwill", label: "Goodwill & Övervärden", icon: Sparkles },
  { value: "interna", label: "Interna transaktioner", icon: Search },
  { value: "kontroll", label: "Kontroll", icon: Shield },
  { value: "las", label: "Lås bokslut", icon: Lock },
];

export const KonsolideringTab = ({ groupId, periodId, groupName, periodStart, periodEnd }: KonsolideringTabProps) => { const [subTab, setSubTab] = useState("stepper");
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleStepComplete = () => { setCompletedSteps(prev => new Set([...prev, currentStep]));
    setCurrentStep(s => Math.min(6, s + 1));
  };

  const renderStage = () => { if (!groupId) return null;
    switch (currentStep) { case 1: return <Stage1Structure groupId={groupId} onComplete={handleStepComplete} />;
      case 2: return <Stage2DataCollection groupId={groupId} periodId={periodId} onComplete={handleStepComplete} />;
      case 3: return <Stage3Adjustments groupId={groupId} periodId={periodId} onComplete={handleStepComplete} />;
      case 4: return <Stage4Eliminations groupId={groupId} periodId={periodId} onComplete={handleStepComplete} />;
      case 5: return <Stage5Report groupId={groupId} periodId={periodId} onComplete={handleStepComplete} />;
      case 6: return <Stage6AnnualReport groupId={groupId} periodId={periodId} groupName={groupName} periodStart={periodStart} periodEnd={periodEnd} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-9 bg-muted/60">
          {SUB_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="stepper" className="mt-4">
          <ConsolidationStepper
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            completedSteps={completedSteps}
          />
          <Card>
            <CardContent className="p-6 min-h-[500px]">
              <div className="animate-fade-in" key={currentStep}>
                {renderStage()}
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">Steg {currentStep} av 6</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1}>
                ← Föregående
              </Button>
              <Button size="sm" onClick={() => setCurrentStep(Math.min(6, currentStep + 1))} disabled={currentStep === 6}>
                Nästa →
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="motparter" className="mt-4">
          <MotparterPanel groupId={groupId} periodId={periodId} />
        </TabsContent>

        <TabsContent value="goodwill" className="mt-4">
          <GoodwillPanel groupId={groupId} />
        </TabsContent>

        <TabsContent value="interna" className="mt-4">
          <InternaTransaktionerPanel groupId={groupId} periodId={periodId} />
        </TabsContent>

        <TabsContent value="kontroll" className="mt-4">
          <KontrollPanel />
        </TabsContent>

        <TabsContent value="las" className="mt-4">
          <LasBokslutPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Motparter Panel (Intercompany Matrix) ───
import { useState as useStateLocal, useEffect as useEffectLocal } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatSEK } from "@/lib/consolidation-engine";

const MotparterPanel = ({ groupId, periodId }: { groupId: string; periodId: string }) => { const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => { loadMatrix();
  }, [groupId, periodId]);

  const loadMatrix = async () => { const { data: comps } = await supabase.from("companies").select("id, name").eq("group_id", groupId).order("name");
    if (!comps) return;
    setCompanies(comps);

    // Build intercompany matrix from trial balances
    if (!periodId) return;
    const { data: balances } = await supabase
      .from("entity_trial_balances")
      .select("entity_id, account_no, closing_balance")
      .eq("consolidation_period_id", periodId);

    const m: Record<string, Record<string, number>> = {};
    comps.forEach(c => { m[c.id] = {}; comps.forEach(c2 => { m[c.id][c2.id] = 0; }); });

    // Detect IC flows from IC accounts (16xx receivables from group companies)
    const icAccounts = (balances || []).filter((b: any) =>
      (b.account_no.startsWith("166") || b.account_no.startsWith("158")) && Math.abs(b.closing_balance) > 0.5
    );

    // Simple heuristic: assign IC receivable from entity A to other entities
    for (const recv of icAccounts) { const otherEntities = comps.filter(c => c.id !== recv.entity_id);
      if (otherEntities.length === 1) { m[recv.entity_id][otherEntities[0].id] = Math.abs(recv.closing_balance);
      }
    }

    setMatrix(m);
  };

  if (companies.length === 0) { return (
      <Card><CardContent className="py-12 text-center">
        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Inga bolag i koncernen</p>
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-semibold mb-1">Motpartsmatris — Interna flöden</h3>
        <p className="text-xs text-muted-foreground mb-4">Visar totala koncerninterna flöden mellan bolag</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b">Säljare ↓ / Köpare →</th>
                {companies.map(c => (
                  <th key={c.id} className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b">{c.name}</th>
                ))}
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(seller => { const rowTotal = companies.reduce((s, buyer) => s + (matrix[seller.id]?.[buyer.id] || 0), 0);
                return (
                  <tr key={seller.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium border-b">{seller.name}</td>
                    {companies.map(buyer => { const amt = matrix[seller.id]?.[buyer.id] || 0;
                      return (
                        <td key={buyer.id} className={cn(
                          "py-2 px-3 text-right tabular-nums border-b",
                          seller.id === buyer.id && "bg-muted/30",
                          amt > 0 && "font-medium"
                        )}>
                          {seller.id === buyer.id ? "—" : amt > 0.5 ? `${formatSEK(amt)} kr` : "—"}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right tabular-nums font-bold border-b">{rowTotal > 0.5 ? `${formatSEK(rowTotal)} kr` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Goodwill Panel ───
const GoodwillPanel = ({ groupId }: { groupId: string }) => { const [acquisitions, setAcquisitions] = useState<any[]>([]);

  useEffect(() => { loadAcquisitions();
  }, [groupId]);

  const loadAcquisitions = async () => { const { data } = await supabase
      .from("group_structure")
      .select(`*, child_entity:companies!group_structure_child_entity_id_fkey(name, org_number)`)
      .eq("group_id", groupId)
      .not("acquisition_price", "is", null);
    setAcquisitions(data || []);
  };

  if (acquisitions.length === 0) { return (
      <Card><CardContent className="py-12 text-center">
        <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <h3 className="text-sm font-semibold mb-1">Inga förvärv registrerade</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Registrera förvärvspris och nettotillgångar i koncernstrukturen för att beräkna goodwill.
        </p>
        <Button variant="outline" size="sm">Gå till Koncernstruktur →</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {acquisitions.map(acq => { const goodwill = acq.goodwill_amount || 0;
        const years = 5;
        const annualDepr = goodwill / years;
        const acqYear = acq.acquisition_date ? new Date(acq.acquisition_date).getFullYear() : new Date().getFullYear();
        const currentYear = new Date().getFullYear();
        const elapsed = Math.min(currentYear - acqYear, years);
        const remainingValue = Math.max(0, goodwill - (annualDepr * elapsed));

        return (
          <Card key={acq.id} className="overflow-hidden">
            <div className="h-[3px] bg-primary" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold">{acq.child_entity?.name || "—"}</h3>
                  <p className="text-xs text-muted-foreground">
                    Förvärvat {acq.acquisition_date || "—"} • {acq.child_entity?.org_number}
                  </p>
                </div>
                <Badge variant="outline">{acq.ownership_pct}% ägande</Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg border p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Förvärvspris</div>
                  <div className="text-lg font-bold tabular-nums mt-0.5">{formatSEK(acq.acquisition_price || 0)} kr</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Nettotillgångar</div>
                  <div className="text-lg font-bold tabular-nums mt-0.5">{formatSEK(acq.net_assets_at_acquisition || 0)} kr</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Goodwill vid förvärv</div>
                  <div className="text-lg font-bold tabular-nums mt-0.5">{formatSEK(goodwill)} kr</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Avskrivningsplan ({years} år)
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: years }, (_, i) => { const year = acqYear + i;
                    const isPast = year <= currentYear;
                    return (
                      <div key={year} className={cn(
                        "flex-1 rounded-lg border p-2 text-center text-xs",
                        isPast ? "bg-muted/50" : "bg-card"
                      )}>
                        <div className="font-medium">{year}</div>
                        <div className={cn("tabular-nums", isPast ? "text-destructive" : "text-muted-foreground")}>
                          −{formatSEK(annualDepr)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Redovisat värde UB {currentYear}</span>
                <span className="text-lg font-bold tabular-nums">{formatSEK(remainingValue)} kr</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ─── Interna Transaktioner Panel ───
const InternaTransaktionerPanel = ({ groupId, periodId }: { groupId: string; periodId: string }) => { const [transactions, setTransactions] = useState<any[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [filter, setFilter] = useState("alla");

  useEffect(() => { detect();
  }, [groupId, periodId]);

  const detect = async () => { setIsDetecting(true);
    const [compRes, balRes] = await Promise.all([
      supabase.from("companies").select("id, name").eq("group_id", groupId),
      periodId ? supabase.from("entity_trial_balances").select("*").eq("consolidation_period_id", periodId) : Promise.resolve({ data: [] }),
    ]);

    const comps = compRes.data || [];
    setCompanies(comps);
    const balances = balRes.data || [];
    const compMap = new Map(comps.map((c: any) => [c.id, c.name]));
    const detected: any[] = [];

    // IC receivables vs payables
    const receivables = balances.filter((b: any) => (b.account_no.startsWith("166") || b.account_no.startsWith("158")) && Math.abs(b.closing_balance) > 0.5);
    const payables = balances.filter((b: any) => (b.account_no.startsWith("266") || b.account_no.startsWith("244") || b.account_no.startsWith("282")) && Math.abs(b.closing_balance) > 0.5);

    for (const recv of receivables) { for (const pay of payables) { if (recv.entity_id === pay.entity_id) continue;
        const diff = Math.abs(recv.closing_balance + pay.closing_balance);
        if (diff < Math.abs(recv.closing_balance) * 0.1) { detected.push({ id: `${recv.entity_id}-${pay.entity_id}-${recv.account_no}`,
            type: "fordran_skuld",
            seller: compMap.get(recv.entity_id) || "",
            buyer: compMap.get(pay.entity_id) || "",
            sellerAccount: recv.account_no,
            buyerAccount: pay.account_no,
            amount: Math.abs(recv.closing_balance),
            diff,
            matchStatus: diff < 0.01 ? "matched" : "diff",
          });
        }
      }
    }

    // Revenue/cost matches
    const revenues = balances.filter((b: any) => b.account_no.startsWith("3") && Math.abs(b.closing_balance) > 1000);
    const costs = balances.filter((b: any) => /^[4-6]/.test(b.account_no) && Math.abs(b.closing_balance) > 1000);
    for (const rev of revenues) { for (const cost of costs) { if (rev.entity_id === cost.entity_id) continue;
        const revAmt = Math.abs(rev.closing_balance);
        const costAmt = Math.abs(cost.closing_balance);
        if (Math.abs(revAmt - costAmt) < revAmt * 0.05 && revAmt > 5000) { detected.push({ id: `rev-${rev.entity_id}-${cost.entity_id}`,
            type: "intakt_kostnad",
            seller: compMap.get(rev.entity_id) || "",
            buyer: compMap.get(cost.entity_id) || "",
            sellerAccount: rev.account_no,
            buyerAccount: cost.account_no,
            amount: revAmt,
            diff: Math.abs(revAmt - costAmt),
            matchStatus: Math.abs(revAmt - costAmt) < 0.01 ? "matched" : "diff",
          });
        }
      }
    }

    setTransactions(detected);
    setIsDetecting(false);
  };

  const filtered = filter === "alla" ? transactions : transactions.filter(t => t.type === filter);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Register — Interna transaktioner</h3>
            <p className="text-xs text-muted-foreground">{transactions.length} transaktioner detekterade</p>
          </div>
          <Button variant="outline" size="sm" onClick={detect} disabled={isDetecting}>
            <Search className="w-3.5 h-3.5 mr-1.5" />
            Sök igen
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { value: "alla", label: "Alla" },
            { value: "fordran_skuld", label: "Fordran/Skuld" },
            { value: "intakt_kostnad", label: "Intäkt/Kostnad" },
          ].map(f => (
            <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} className="text-xs" onClick={() => setFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Inga koncerninterna transaktioner hittades
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="text-left py-2">Säljare</th>
                  <th className="text-left py-2">Köpare</th>
                  <th className="text-left py-2">Typ</th>
                  <th className="text-right py-2">Belopp</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 font-medium">{t.seller}</td>
                    <td className="py-2">{t.buyer}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {t.type === "fordran_skuld" ? "Fordran/Skuld" : "Intäkt/Kostnad"}
                      </Badge>
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatSEK(t.amount)} kr</td>
                    <td className="py-2">
                      {t.matchStatus === "matched" ? (
                        <Badge className="bg-[hsl(var(--status-green-bg))] text-[hsl(var(--status-green))] text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Avstämd
                        </Badge>
                      ) : (
                        <Badge className="bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/20 dark:text-[#C28A2B] text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" />Diff: {formatSEK(t.diff)} kr
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Kontroll Panel ───
import { useEffect } from "react";

const KontrollPanel = () => { const checks = [
    { category: "DATAKVALITET", items: [
      { label: "Alla bolag importerade", status: "ok", action: null },
      { label: "Alla saldobalanser balanserar", status: "ok", action: null },
      { label: "Kontoplan-mappning komplett", status: "warn", action: "Mappa 3 konton" },
    ]},
    { category: "ELIMINERINGAR", items: [
      { label: "Förvärvsanalys genomförd", status: "ok", action: null },
      { label: "Interna fordringar/skulder eliminerade", status: "ok", action: null },
      { label: "Interna transaktioner kontrollerade", status: "warn", action: "1 odetekterad" },
      { label: "Goodwill-avskrivning bokförd", status: "pending", action: "Boka avskrivning" },
    ]},
    { category: "RAPPORT", items: [
      { label: "Koncernresultaträkning genererad", status: "ok", action: null },
      { label: "Balansräkning balanserar", status: "ok", action: null },
      { label: "Kassaflödesanalys genererad", status: "ok", action: null },
      { label: "Förändringar i EK genererad", status: "ok", action: null },
    ]},
    { category: "NOTER", items: [
      { label: "Not 1 Redovisningsprinciper", status: "ok", action: null },
      { label: "Not 2 Koncernens sammansättning", status: "ok", action: null },
      { label: "Not 3 Förvärvsanalys", status: "pending", action: null },
      { label: "Not 4 Goodwill", status: "ok", action: null },
    ]},
    { category: "SIGNERING & INLÄMNING", items: [
      { label: "Signerad av styrelse", status: "pending", action: null },
      { label: "Inlämnad till Bolagsverket", status: "pending", action: null },
    ]},
  ];

  const statusIcon = (s: string) => { switch (s) { case "ok": return <CheckCircle2 className="w-4 h-4 text-[hsl(var(--status-green))]" />;
      case "warn": return <AlertTriangle className="w-4 h-4 text-[hsl(var(--status-orange))]" />;
      case "error": return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground/40" />;
    }
  };

  const totalChecks = checks.reduce((s, c) => s + c.items.length, 0);
  const passedChecks = checks.reduce((s, c) => s + c.items.filter(i => i.status === "ok").length, 0);
  const pct = Math.round((passedChecks / totalChecks) * 100);
  const remaining = totalChecks - passedChecks;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Konsolideringskontroll</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{remaining} åtgärder återstår</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-40 h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`,
                background: pct === 100 ? "hsl(var(--status-green))" : pct > 60 ? "hsl(var(--status-orange))" : "hsl(var(--destructive))"
              }} />
            </div>
            <span className={cn("text-sm font-bold", pct === 100 ? "text-[hsl(var(--status-green))]" : "text-foreground")}>{pct}% klar</span>
          </div>
        </div>

        {checks.map(cat => (
          <div key={cat.category}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat.category}</div>
            <div className="space-y-1">
              {cat.items.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    {statusIcon(item.status)}
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {(item.status === "error" || item.status === "warn") && item.action && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-primary">{item.action} →</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ─── Lås Bokslut Panel ───
const LasBokslutPanel = () => { const preLockChecks = [
    { label: "Alla elimineringar godkända", ok: true },
    { label: "Balansräkning balanserar", ok: true },
    { label: "Kassaflöde genererat", ok: true },
    { label: "Noter kompletta", ok: false },
  ];
  const allPassed = preLockChecks.every(c => c.ok);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="max-w-lg mx-auto text-center py-8">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Lås konsolidering</h3>
          <p className="text-sm text-muted-foreground mb-6">
            En låst period skapar en oföränderlig ögonblicksbild med tidsstämpel och hashsumma.
          </p>

          <div className="text-left space-y-2 mb-6 p-4 rounded-lg bg-muted/50">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Förutsättningar</div>
            {preLockChecks.map(c => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--status-green))]" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/40" />
                )}
                <span className={cn(!c.ok && "text-muted-foreground")}>{c.label}</span>
              </div>
            ))}
          </div>

          <Button disabled={!allPassed} size="lg">
            {allPassed ? "Bekräfta låsning" : "Alla kontroller måste passera först"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
