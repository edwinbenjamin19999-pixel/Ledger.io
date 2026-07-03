import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ArrowRight, Play, Clock, Settings, Download, History, Building2, BarChart3, FileText, TrendingUp, BookOpen } from "lucide-react";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Tab content components
import { KoncernhanteringTab } from "@/components/consolidation/tabs/KoncernhanteringTab";
import { KonsolideringTab } from "@/components/consolidation/tabs/KonsolideringTab";
import { KoncernrapportTab } from "@/components/consolidation/tabs/KoncernrapportTab";
import { AnalysBudgetTab } from "@/components/consolidation/tabs/AnalysBudgetTab";
import { ArsredovisningTab } from "@/components/consolidation/tabs/ArsredovisningTab";

const Consolidation = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<{ id: string; name: string; currency?: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [primaryTab, setPrimaryTab] = useState<string>("koncernhantering");

  const currentYear = new Date().getFullYear();
  const [periodStart, setPeriodStart] = useState(`${currentYear}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${currentYear}-12-31`);
  const [periodId, setPeriodId] = useState<string>("");

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => { if (user) loadGroups();
  }, [user]);

  useEffect(() => { if (!selectedGroupId || !user) return;
    ensurePeriod();
  }, [selectedGroupId, periodStart, periodEnd, user]);

  const ensurePeriod = async () => { if (!selectedGroupId || !user) return;
    try { const { data: existing } = await supabase
        .from("consolidation_periods")
        .select("id")
        .eq("group_id", selectedGroupId)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .maybeSingle();

      if (existing) { setPeriodId(existing.id);
        return;
      }

      const { data: newPeriod, error } = await supabase
        .from("consolidation_periods")
        .insert({ group_id: selectedGroupId,
          period_start: periodStart,
          period_end: periodEnd,
          status: "draft",
          created_by: user.id,
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;
      setPeriodId(newPeriod.id);
    } catch (err: any) { console.error("Could not ensure period:", err.message);
    }
  };

  const loadGroups = async () => { const { data } = await supabase.from("groups").select("id, name, currency").order("name");
    if (data && data.length > 0) { setGroups(data);
      if (!selectedGroupId) setSelectedGroupId(data[0].id);
    }
  };

  if (loading) { return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="flex-1 h-[500px]" />
      </div>
    );
  }

  if (!user) return null;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const showContextBar = primaryTab !== "koncernhantering";

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Koncernkonsolidering"
        subtitle="Automatisk konsolidering med AI-driven eliminering — ÅRL kap 7 & K3"
        actions={ <div className="flex items-center gap-2">
            <ComingSoonButton tooltipText="Visa historiska konsolideringar">
              Historik
            </ComingSoonButton>
            <ComingSoonButton tooltipText="Exportera konsolideringsrapport">
              Exportera
            </ComingSoonButton>
          </div>
        }
      />
      <main className="px-8">

        {/* PRIMARY TAB BAR */}
        <Tabs value={primaryTab} onValueChange={setPrimaryTab}>
          <TabsList className="mb-4 h-11 bg-muted/60">
            <TabsTrigger value="koncernhantering" className="gap-1.5 text-[13px]">
              <Building2 className="w-4 h-4" />
              Koncernhantering
            </TabsTrigger>
            <TabsTrigger value="konsolidering" className="gap-1.5 text-[13px]">
              <Settings className="w-4 h-4" />
              Konsolidering
            </TabsTrigger>
            <TabsTrigger value="koncernrapport" className="gap-1.5 text-[13px]">
              <FileText className="w-4 h-4" />
              Koncernrapport
            </TabsTrigger>
            <TabsTrigger value="analys" className="gap-1.5 text-[13px]">
              <TrendingUp className="w-4 h-4" />
              Analys & Budget
            </TabsTrigger>
            <TabsTrigger value="årsredovisning" className="gap-1.5 text-[13px]">
              <BookOpen className="w-4 h-4" />
              Årsredovisning
            </TabsTrigger>
          </TabsList>

          {/* Context bar för all tabs except Koncernhantering */}
          {showContextBar && groups.length > 0 && (
            <div className="konc-context-bar rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Koncern</label>
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger className="w-[220px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Period start</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={e => setPeriodStart(e.target.value)}
                    className="flex h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground mt-4" />
                <div className="space-y-0.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Period slut</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={e => setPeriodEnd(e.target.value)}
                    className="flex h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Senast kördes: —
                </span>
                {primaryTab === "konsolidering" && (
                  <Button size="sm" onClick={() => toast.info("Konsolideringen körs automatiskt vid steg 5 — Rapport")}>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Kör konsolidering
                  </Button>
                )}
              </div>
            </div>
          )}

          <TabsContent value="koncernhantering">
            <KoncernhanteringTab onGroupCreated={loadGroups} groups={groups} />
          </TabsContent>

          <TabsContent value="konsolidering">
            {groups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Skapa en koncern under "Koncernhantering" först.
                  </p>
                  <Button onClick={() => setPrimaryTab("koncernhantering")}>
                    Gå till Koncernhantering
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <KonsolideringTab
                groupId={selectedGroupId}
                periodId={periodId}
                groupName={selectedGroup?.name || ""}
                periodStart={periodStart}
                periodEnd={periodEnd}
              />
            )}
          </TabsContent>

          <TabsContent value="koncernrapport">
            {groups.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Skapa en koncern först.</p>
              </CardContent></Card>
            ) : (
              <KoncernrapportTab
                groupId={selectedGroupId}
                periodId={periodId}
                groupName={selectedGroup?.name || ""}
                currency={selectedGroup?.currency || "SEK"}
              />
            )}
          </TabsContent>

          <TabsContent value="analys">
            {groups.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Skapa en koncern först.</p>
              </CardContent></Card>
            ) : (
              <AnalysBudgetTab
                groupId={selectedGroupId}
                periodId={periodId}
                groupName={selectedGroup?.name || ""}
              />
            )}
          </TabsContent>

          <TabsContent value="årsredovisning">
            {groups.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Skapa en koncern först.</p>
              </CardContent></Card>
            ) : (
              <ArsredovisningTab
                groupId={selectedGroupId}
                periodId={periodId}
                groupName={selectedGroup?.name || ""}
                periodStart={periodStart}
                periodEnd={periodEnd}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Consolidation;
