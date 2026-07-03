import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryKPIStrip } from "@/components/inventory/InventoryKPIStrip";
import { InventoryAIAlertPanel } from "@/components/inventory/InventoryAIAlertPanel";
import { ArticleRegistry } from "@/components/inventory/ArticleRegistry";
import { InventoryTransactions } from "@/components/inventory/InventoryTransactions";
import { InventoryAICount } from "@/components/inventory/InventoryAICount";
import { InventoryAnalysis } from "@/components/inventory/InventoryAnalysis";
import { PurchaseOrders } from "@/components/inventory/PurchaseOrders";
import { InventorySmartPurchaseOrder } from "@/components/inventory/InventorySmartPurchaseOrder";
import { InventoryDemandForecast } from "@/components/inventory/InventoryDemandForecast";
import { InventoryPriceOptimization } from "@/components/inventory/InventoryPriceOptimization";
import { InventoryShrinkageAnalysis } from "@/components/inventory/InventoryShrinkageAnalysis";
import { InventorySupplierComparison } from "@/components/inventory/InventorySupplierComparison";
import { PageHeader } from "@/components/layout/PageHeader";
import { Package } from "lucide-react";

const InventoryPage = () => { return (
    <div>
      <PageHeader
        icon={Package}
        title="Lagerredovisning"
        subtitle="AI-driven lagerhantering med automatisk bokföring"
      />
      <div className="px-8 space-y-6">
        <InventoryAIAlertPanel />

        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="articles">Artikelregister</TabsTrigger>
            <TabsTrigger value="transactions">Lagertransaktioner</TabsTrigger>
            <TabsTrigger value="count">AI-inventering</TabsTrigger>
            <TabsTrigger value="analysis">Lageranalys</TabsTrigger>
            <TabsTrigger value="forecast">Prognos</TabsTrigger>
            <TabsTrigger value="smartorder">Smart inköpsorder</TabsTrigger>
            <TabsTrigger value="pricing">Prisoptimering</TabsTrigger>
            <TabsTrigger value="shrinkage">Svinnanalys</TabsTrigger>
            <TabsTrigger value="suppliers">Leverantörer</TabsTrigger>
            <TabsTrigger value="orders">Inköpsordrar</TabsTrigger>
          </TabsList>
          <TabsContent value="articles"><ArticleRegistry /></TabsContent>
          <TabsContent value="transactions"><InventoryTransactions /></TabsContent>
          <TabsContent value="count"><InventoryAICount /></TabsContent>
          <TabsContent value="analysis"><InventoryAnalysis /></TabsContent>
          <TabsContent value="forecast"><InventoryDemandForecast /></TabsContent>
          <TabsContent value="smartorder"><InventorySmartPurchaseOrder /></TabsContent>
          <TabsContent value="pricing"><InventoryPriceOptimization /></TabsContent>
          <TabsContent value="shrinkage"><InventoryShrinkageAnalysis /></TabsContent>
          <TabsContent value="suppliers"><InventorySupplierComparison /></TabsContent>
          <TabsContent value="orders"><PurchaseOrders /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InventoryPage;
