import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, Settings2, TrendingUp, Package, AlertTriangle,
  Receipt, ArrowLeftRight, Sparkles, Upload, ShoppingCart
} from "lucide-react";
import { PosConnection, usePosDailySales, formatKr } from "@/hooks/useKassaregister";
import { useKassaregisterStats } from "@/hooks/useKassaregisterStats";
import { DailySalesView } from "./DailySalesView";
import { PosZReportCompliant } from "./PosZReportCompliant";
import { PosCSVImport } from "./PosCSVImport";
import { PosSalesDetail } from "./PosSalesDetail";
import { PosReconciliation } from "./PosReconciliation";
import { PosAIInsightsPanel } from "./PosAIInsightsPanel";
import { PosKPICards } from "./PosKPICards";
import { KassaZReportBooking } from "./KassaZReportBooking";
import { KassaSalesForecast } from "./KassaSalesForecast";
import { KassaProductAnalysis } from "./KassaProductAnalysis";
import { KassaCashDiscrepancy } from "./KassaCashDiscrepancy";
import { VatCategorySettings } from "./VatCategorySettings";
import { ActivationHero } from "@/components/shared/ActivationHero";
import { format, subDays } from "date-fns";

interface Props { connection: PosConnection;
}

export function KassaDashboard({ connection }: Props) { const currentMonth = format(new Date(), "yyyy-MM");
  const { sales } = usePosDailySales(currentMonth);

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: csvStats } = useKassaregisterStats(today);
  const todaySales = sales.find((s) => s.sale_date === today);
  const yesterdaySales = sales.find((s) => s.sale_date === format(subDays(new Date(), 1), "yyyy-MM-dd"));

  const monthTotal = sales.reduce((s, d) => s + d.total_sales, 0) + (csvStats?.totalSales ?? 0);
  const monthVat = Math.round(monthTotal * 0.18) + (csvStats?.totalVAT ?? 0);
  const monthRefunds = 0;

  const hasAnySales = sales.length > 0 || (csvStats?.totalSales ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kassaregister</h1>
          <p className="text-sm text-muted-foreground">
            Ansluten till {connection.provider_name} · Automatisk bokföring av Z-rapporter
          </p>
        </div>
      </div>

      {/* Activation hero when no sales yet (Law 2) */}
      {!hasAnySales && (
        <ActivationHero
          icon={Receipt}
          title="Aktivera automatisk Z-rapport-bokföring"
          valueProp="AI bokför dagsavslut, moms (12% / 25%) och kassadifferens automatiskt → sparar ~6h/månad och eliminerar manuella fel."
          steps={[
            { label: `${connection.provider_name} är ansluten`, done: true },
            { label: "Genomför dagens första försäljning i kassan" },
            { label: "AI skapar Z-rapport och bokför automatiskt vid dagens slut" },
          ]}
          primaryCtaLabel="Importera försäljning manuellt"
          onPrimaryCta={() => {
            const tab = document.querySelector('[value="import"]') as HTMLElement | null;
            tab?.click();
          }}
          secondaryCtaLabel="Visa inställningar"
          onSecondaryCta={() => {
            const tab = document.querySelector('[value="settings"]') as HTMLElement | null;
            tab?.click();
          }}
        />
      )}

      {/* KPI Cards */}
      {hasAnySales && (
        <PosKPICards
          todaySales={todaySales}
          yesterdaySales={yesterdaySales}
          monthTotal={monthTotal}
          monthVat={monthVat}
          monthRefunds={monthRefunds}
        />
      )}

      {/* Main tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Översikt
          </TabsTrigger>
          <TabsTrigger value="zreport" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Z-rapporter
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Bokföring
          </TabsTrigger>
          <TabsTrigger value="detail" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            Försäljningsdetalj
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Avstämning
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI-analys
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Import
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Prognos
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Produkter
          </TabsTrigger>
          <TabsTrigger value="discrepancy" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Kassadifferens
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Inställningar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DailySalesView connection={connection} />
        </TabsContent>
        <TabsContent value="zreport">
          <PosZReportCompliant />
        </TabsContent>
        <TabsContent value="booking">
          <KassaZReportBooking sales={sales} />
        </TabsContent>
        <TabsContent value="detail">
          <PosSalesDetail sales={sales} />
        </TabsContent>
        <TabsContent value="reconciliation">
          <PosReconciliation sales={sales} />
        </TabsContent>
        <TabsContent value="ai">
          <PosAIInsightsPanel sales={sales} />
        </TabsContent>
        <TabsContent value="import">
          <PosCSVImport />
        </TabsContent>
        <TabsContent value="forecast">
          <KassaSalesForecast sales={sales} />
        </TabsContent>
        <TabsContent value="products">
          <KassaProductAnalysis sales={sales} />
        </TabsContent>
        <TabsContent value="discrepancy">
          <KassaCashDiscrepancy sales={sales} />
        </TabsContent>
        <TabsContent value="settings">
          <VatCategorySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
