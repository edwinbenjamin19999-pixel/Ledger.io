import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Play, Zap, Info, Package, Sparkles, BarChart3, FileText, Calculator, QrCode, Brain, ClipboardCheck, FileSpreadsheet, FileDown } from "lucide-react";
import { exportAssetRegisterExcel, exportAssetRegisterPDF } from "@/lib/assets/exportRegister";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { AssetKPIStrip } from "@/components/assets/AssetKPIStrip";
import { AIActionCenter } from "@/components/assets/AIActionCenter";
import { AssetCard } from "@/components/assets/AssetCard";
import { CreateAssetWizard } from "@/components/assets/CreateAssetWizard";
import { DisposalDialog } from "@/components/assets/DisposalDialog";
import { QRCodeDialog } from "@/components/assets/QRCodeDialog";
import { INK2SPanel } from "@/components/assets/INK2SPanel";
import { AnnualReportNote } from "@/components/assets/AnnualReportNote";
import { LeaseVsBuyAnalysis } from "@/components/assets/LeaseVsBuyAnalysis";
import { AssetVerification } from "@/components/assets/AssetVerification";
import { useAssets, type FixedAsset } from "@/hooks/useAssets";
import { type AssetClass, CLASS_LABELS } from "@/lib/asset-types";
import { type DepreciationMethod } from "@/lib/depreciation-rules";

interface Company { id: string;
  name: string;
}

const Depreciation = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [runningDepreciation, setRunningDepreciation] = useState(false);
  const [classFilter, setClassFilter] = useState<AssetClass | "all">("all");
  const [activeTab, setActiveTab] = useState("register");

  // Disposal state
  const [disposalAssetId, setDisposalAssetId] = useState<string | null>(null);
  const [disposalMode, setDisposalMode] = useState<"sell" | "scrap">("sell");
  const [qrAssetId, setQrAssetId] = useState<string | null>(null);

  const { assets, entries, events, loading: loadingAssets, kpis, getBookValue, getAccumulated, createAsset, updateAsset, reload, detectedTransactions } = useAssets(selectedCompany || null);

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => { if (user) { supabase.from("companies").select("id, name").order("name").then(({ data }) => { if (data && data.length > 0) { setCompanies(data);
          const saved = localStorage.getItem("dashboard:selectedCompanyId");
          setSelectedCompany(saved && data.find(c => c.id === saved) ? saved : data[0].id);
        }
      });
    }
  }, [user]);

  // Open asset from QR link
  useEffect(() => { const assetParam = searchParams.get("asset");
    if (assetParam && assets.length > 0) { const found = assets.find(a => a.id === assetParam);
      if (found) setQrAssetId(found.id);
    }
  }, [searchParams, assets]);

  const filteredAssets = useMemo(() => { return classFilter === "all" ? assets : assets.filter(a => a.asset_class === classFilter);
  }, [assets, classFilter]);

  const disposalAsset = useMemo(() => assets.find(a => a.id === disposalAssetId) || null, [assets, disposalAssetId]);
  const qrAsset = useMemo(() => assets.find(a => a.id === qrAssetId) || null, [assets, qrAssetId]);

  const handleDispose = (id: string) => { setDisposalAssetId(id);
    setDisposalMode("sell");
  };

  const handleScrap = (id: string) => { setDisposalAssetId(id);
    setDisposalMode("scrap");
  };

  const runDepreciation = async (periodStart: string, periodEnd: string) => { if (!selectedCompany || !user) return;
    setRunningDepreciation(true);
    try { const activeAssets = assets.filter(a => a.is_active && a.asset_class !== "financial");
      let created = 0;
      for (const asset of activeAssets) { const existing = entries.find(e => e.fixed_asset_id === asset.id && e.period_start === periodStart);
        if (existing) continue;
        const assetEntries = entries.filter(e => e.fixed_asset_id === asset.id)
          .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());
        const lastEntry = assetEntries[0];
        const currentBookValue = lastEntry ? lastEntry.book_value : asset.acquisition_cost;
        const currentAccumulated = lastEntry ? lastEntry.accumulated_depreciation : 0;
        if (currentBookValue <= (asset.residual_value || 0) + 0.01) continue;

        let amount: number;
        const method = asset.depreciation_method as DepreciationMethod;
        if (method === "declining_balance_30") { amount = Math.round(currentBookValue * 0.30 / 12 * 100) / 100;
        } else if (method === "declining_balance_20") { amount = Math.round(asset.acquisition_cost * 0.20 / 12 * 100) / 100;
        } else { amount = Math.round((asset.acquisition_cost - (asset.residual_value || 0)) / (asset.useful_life_years * 12) * 100) / 100;
        }
        amount = Math.min(amount, currentBookValue - (asset.residual_value || 0));
        if (amount <= 0) continue;

        const { error } = await supabase.from("depreciation_entries").insert({ fixed_asset_id: asset.id,
          period_start: periodStart,
          period_end: periodEnd,
          depreciation_amount: amount,
          accumulated_depreciation: Math.round((currentAccumulated + amount) * 100) / 100,
          book_value: Math.round((currentBookValue - amount) * 100) / 100,
        });
        if (!error) created++;
      }
      toast.success(`${created} avskrivningsposter skapade`);
      setShowRunDialog(false);
      reload();
    } catch (error: any) { toast.error("Fel: " + error.message);
    } finally { setRunningDepreciation(false);
    }
  };

  if (loading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const now = new Date();
  const currentPeriodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const currentPeriodEnd = endOfMonth.toISOString().split("T")[0];
  const activeDepreciable = assets.filter(a => a.is_active && a.asset_class !== "financial").length;

  return (
    <div>
      <PageHeader
        icon={Package}
        title="Tillgångar och utrustning"
        subtitle="Materiella, immateriella och finansiella tillgångar — automatisk bokföring och skatteberäkning"
        badge={{ label: "AI-driven", variant: "ai" }}
        actions={ <div className="flex items-center gap-2 flex-wrap">
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Valj foretag" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" disabled={activeDepreciable === 0} onClick={() => setShowRunDialog(true)} size="sm">
              <Play className="w-4 h-4 mr-1.5" />
              Kör avskrivning
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={assets.length === 0}
              onClick={() => {
                const cName = companies.find((c) => c.id === selectedCompany)?.name || "Företag";
                exportAssetRegisterExcel(assets, entries, getBookValue, getAccumulated, cName);
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={assets.length === 0}
              onClick={() => {
                const cName = companies.find((c) => c.id === selectedCompany)?.name || "Företag";
                exportAssetRegisterPDF(assets, getBookValue, getAccumulated, cName);
              }}
            >
              <FileDown className="w-4 h-4 mr-1.5" /> PDF
            </Button>
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Ny tillgång
            </Button>
          </div>
        }
      />
      <main className="px-8 space-y-6">

        {/* KPI Strip */}
        <AssetKPIStrip
          assets={assets}
          entries={entries}
          getBookValue={getBookValue}
          getAccumulated={getAccumulated}
        />

        {/* AI Action Center */}
        <AIActionCenter
          missingDepreciation={kpis.missingDepreciation}
          fullyDepreciated={kpis.fullyDepreciated}
          onSelectAsset={(id) => { // Scroll to asset card or expand it
          }}
        />

        {/* Auto-detection banner */}
        {detectedTransactions.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">AI har identifierat tillgångskonton i bokföringen</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {detectedTransactions.map(d => `${d.account} ${d.name} (${d.amount.toLocaleString("sv-SE")} kr)`).join(" | ")}
                  </p>
                  <Button variant="link" size="sm" className="px-0 mt-1 h-auto text-xs" onClick={() => setShowCreate(true)}>
                    Registrera som tillgång
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="register" className="gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5" /> Register
            </TabsTrigger>
            <TabsTrigger value="ink2s" className="gap-1.5 text-xs">
              <Calculator className="w-3.5 h-3.5" /> INK2S
            </TabsTrigger>
            <TabsTrigger value="annual-note" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> Årsredovisningsnot
            </TabsTrigger>
            <TabsTrigger value="lease-buy" className="gap-1.5 text-xs">
              <Brain className="w-3.5 h-3.5" /> Leasing vs Köp
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 text-xs">
              <ClipboardCheck className="w-3.5 h-3.5" /> Inventering
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="mt-6 space-y-4">
            {/* Class filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "tangible", "intangible", "financial"] as const).map(cls => (
                <Button
                  key={cls}
                  variant={classFilter === cls ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setClassFilter(cls)}
                >
                  {cls === "all" ? "Alla" : CLASS_LABELS[cls]}
                  {cls !== "all" && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                      {assets.filter(a => a.asset_class === cls).length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Asset cards */}
            {loadingAssets ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>Inga tillgångar att visa</p>
                <p className="text-sm mt-1">Lägg till en tillgång eller vänta på att systemet upptäcker en automatiskt</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    entries={entries.filter(e => e.fixed_asset_id === asset.id)}
                    bookValue={getBookValue(asset)}
                    accumulated={getAccumulated(asset)}
                    onDispose={handleDispose}
                    onScrap={handleScrap}
                    onRevalue={() => toast.info("Omvärdering — kontakta din revisor för att initiera omvärdering av tillgången")}
                    onQR={setQrAssetId}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ink2s" className="mt-6">
            <INK2SPanel assets={assets} getBookValue={getBookValue} />
          </TabsContent>

          <TabsContent value="annual-note" className="mt-6">
            <AnnualReportNote assets={assets} getBookValue={getBookValue} getAccumulated={getAccumulated} />
          </TabsContent>

          <TabsContent value="lease-buy" className="mt-6">
            <LeaseVsBuyAnalysis />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <AssetVerification assets={assets} />
          </TabsContent>
        </Tabs>

        {/* Run Depreciation Dialog */}
        <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kör månatlig avskrivning</DialogTitle>
              <DialogDescription>
                Skapa avskrivningsposter för alla aktiva tillgångar under perioden.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="font-medium">Period: {currentPeriodStart} — {currentPeriodEnd}</p>
                <p className="text-sm text-muted-foreground">
                  {activeDepreciable} tillgångar med avskrivning kommer att behandlas
                </p>
              </div>
              <div className="bg-[#E1F5EE] dark:bg-emerald-950/20 rounded-lg p-3 text-xs space-y-1">
                <p className="font-medium text-[#085041] dark:text-emerald-300">Samlat verifikat skapas:</p>
                <p className="font-mono text-[#085041] dark:text-[#1D9E75]">
                  Debet 7832 (Avskrivningar inventarier): {kpis.monthlyDepreciation.toLocaleString("sv-SE")} kr
                </p>
                <p className="font-mono text-[#085041] dark:text-[#1D9E75]">
                  Kredit 1229 (Ack. avskrivningar): {kpis.monthlyDepreciation.toLocaleString("sv-SE")} kr
                </p>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>Kategori A — kräver ej BankID-signering. Befintliga poster för perioden hoppas over.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRunDialog(false)}>Avbryt</Button>
              <Button onClick={() => runDepreciation(currentPeriodStart, currentPeriodEnd)} disabled={runningDepreciation}>
                {runningDepreciation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Signera och bokfor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Wizard */}
        <CreateAssetWizard open={showCreate} onOpenChange={setShowCreate} onCreateAsset={createAsset} />

        {/* Disposal Dialog */}
        <DisposalDialog
          asset={disposalAsset}
          bookValue={disposalAsset ? getBookValue(disposalAsset) : 0}
          mode={disposalMode}
          open={!!disposalAssetId}
          onOpenChange={(open) => { if (!open) setDisposalAssetId(null); }}
          onConfirm={updateAsset}
        />

        {/* QR Code Dialog */}
        <QRCodeDialog
          asset={qrAsset}
          open={!!qrAssetId}
          onOpenChange={(open) => { if (!open) setQrAssetId(null); }}
        />
      </main>
    </div>
  );
};

export default Depreciation;
