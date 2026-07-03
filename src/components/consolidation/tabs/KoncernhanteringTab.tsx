import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CheckCircle2, RefreshCw, Download, Play, TrendingUp, TrendingDown, Users, ArrowRight, AlertTriangle, FileText, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GroupOverview } from "@/components/consolidation/GroupOverview";
import { formatSEK } from "@/lib/consolidation-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface KoncernhanteringTabProps { onGroupCreated: () => void;
  groups: { id: string; name: string; currency?: string }[];
}

interface EntitySummary { id: string;
  name: string;
  org_number: string;
  revenue: number;
  result: number;
  accountCount: number;
  lastImported: string | null;
}

export const KoncernhanteringTab = ({ onGroupCreated, groups }: KoncernhanteringTabProps) => { const [groupEntities, setGroupEntities] = useState<Record<string, EntitySummary[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => { if (groups.length > 0) { loadEntitySummaries();
      setExpandedGroups(new Set(groups.map(g => g.id)));
    } else { setIsLoading(false);
    }
  }, [groups]);

  const loadEntitySummaries = async () => { setIsLoading(true);
    const summaries: Record<string, EntitySummary[]> = {};
    
    for (const group of groups) { const { data: companies } = await supabase
        .from("companies")
        .select("id, name, org_number")
        .eq("group_id", group.id)
        .order("name");

      if (companies) { const companyIds = companies.map(c => c.id);
        
        // Batch fetch all journal entry lines för all companies in this group
        const { data: entries } = await supabase
          .from("journal_entries")
          .select("id, company_id")
          .in("company_id", companyIds)
          .eq("status", "approved");
        
        const entryIds = (entries || []).map(e => e.id);
        const entryCompanyMap = new Map((entries || []).map(e => [e.id, e.company_id]));
        
        let lines: any[] = [];
        if (entryIds.length > 0) { const { data } = await supabase
            .from("journal_entry_lines")
            .select("journal_entry_id, debit, credit, chart_of_accounts!inner(account_number)")
            .in("journal_entry_id", entryIds);
          lines = data || [];
        }

        const entities: EntitySummary[] = companies.map(c => { let revenue = 0, costs = 0, accCount = 0;
          const accountSet = new Set<string>();
          
          lines.forEach((l: any) => { const companyId = entryCompanyMap.get(l.journal_entry_id);
            if (companyId !== c.id) return;
            const accNo = l.chart_of_accounts?.account_number || "";
            accountSet.add(accNo);
            const bal = (l.debit || 0) - (l.credit || 0);
            if (accNo.startsWith("3")) revenue += -bal;
            else if (accNo >= "4" && accNo < "9") costs += bal;
          });

          return { id: c.id,
            name: c.name,
            org_number: c.org_number,
            revenue,
            result: revenue - costs,
            accountCount: accountSet.size,
            lastImported: lines.length > 0 ? new Date().toISOString() : null,
          };
        });
        
        summaries[group.id] = entities;
      }
    }
    setGroupEntities(summaries);
    setIsLoading(false);
  };

  if (isLoading) { return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(group => { const entities = groupEntities[group.id] || [];
        const totalRevenue = entities.reduce((s, e) => s + e.revenue, 0);
        const totalResult = entities.reduce((s, e) => s + e.result, 0);
        const isExpanded = expandedGroups.has(group.id);

        return (
          <div key={group.id} className="space-y-4">
            {/* Overview Widget */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />
                <CardContent className="p-4 pt-5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Antal bolag</div>
                  <div className="text-2xl font-bold tabular-nums mt-1">{entities.length}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Fullkonsolidering</div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "hsl(var(--status-green))" }} />
                <CardContent className="p-4 pt-5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Bokförda intäkter</div>
                  <div className="text-2xl font-bold tabular-nums mt-1">{formatSEK(totalRevenue)} kr</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Koncerntotal</div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: totalResult >= 0 ? "hsl(var(--status-green))" : "hsl(var(--destructive))" }} />
                <CardContent className="p-4 pt-5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Bokfört resultat</div>
                  <div className={cn("text-2xl font-bold tabular-nums mt-1", totalResult < 0 && "text-destructive")}>
                    {formatSEK(totalResult)} kr
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Marginal: {totalRevenue > 0 ? ((totalResult / totalRevenue) * 100).toFixed(1) : "0"}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Group Card */}
            <Card className="rounded-xl overflow-hidden">
              <CardContent className="p-0">
                {/* Group header */}
                <div className="p-5 border-b bg-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold">{group.name}</h3>
                          <Badge variant="outline" className="text-[10px]">Moderbolag</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.currency || "SEK"} • K3 • Räkenskapsår Jan–Dec
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={loadEntitySummaries}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Importera alla
                      </Button>
                      <Button variant="outline" size="sm">
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                        Kör konsolidering
                      </Button>
                      <Button variant="outline" size="sm">
                        <Package className="w-3.5 h-3.5 mr-1.5" />
                        Exportera koncernpaket
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Entity list */}
                {entities.length > 0 ? (
                  <div className="p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Dotterbolag & entiteter ({entities.length})
                    </div>
                    <div className="space-y-2">
                      {entities.map((entity, i) => { const resultPct = entity.revenue > 0 ? ((entity.result / entity.revenue) * 100) : 0;
                        return (
                          <div key={entity.id} className="group flex items-center justify-between py-3 px-4 rounded-xl border hover:shadow-sm hover:-translate-y-[1px] transition-all">
                            <div className="flex items-center gap-3">
                              <span className={`entity-dot entity-dot-${i % 8}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{entity.name}</span>
                                  <span className="text-[11px] text-muted-foreground">{entity.org_number}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                                  <span>{entity.accountCount} konton</span>
                                  <span>•</span>
                                  <span>100% ägande</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Intäkter</div>
                                <div className="text-sm font-medium tabular-nums">{formatSEK(entity.revenue)} kr</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Resultat</div>
                                <div className={cn("text-sm font-medium tabular-nums", entity.result < 0 ? "text-destructive" : "text-[hsl(var(--status-green))]")}>
                                  {formatSEK(entity.result)} kr
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-[hsl(var(--status-green-bg))] text-[hsl(var(--status-green))] border-[hsl(var(--status-green))]/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Klar
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">Inga bolag i koncernen</p>
                    <p className="text-xs text-muted-foreground">Lägg till bolag via koncernöversikten nedan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Group management */}
      <GroupOverview onGroupCreated={onGroupCreated} />
    </div>
  );
};
