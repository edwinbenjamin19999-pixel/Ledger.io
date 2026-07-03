import { useState } from "react";
import { BarChart3, ShoppingCart, ArrowLeftRight,
  BookOpen, Wifi, Sparkles
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { UnifiedCommerceDashboard } from "@/components/commerce/UnifiedCommerceDashboard";
import { CommerceTransactionExplorer } from "@/components/commerce/CommerceTransactionExplorer";
import { CommerceReconciliationCenter } from "@/components/commerce/CommerceReconciliationCenter";
import { CommerceAccountingPreview } from "@/components/commerce/CommerceAccountingPreview";
import { CommerceIntegrationHub } from "@/components/commerce/CommerceIntegrationHub";
import { CommerceAIInsights } from "@/components/commerce/CommerceAIInsights";

const TABS = [
  { label: "Översikt", value: "overview", icon: BarChart3 },
  { label: "Transaktioner", value: "transactions", icon: ShoppingCart },
  { label: "Avstämning", value: "reconciliation", icon: ArrowLeftRight },
  { label: "Bokföring", value: "accounting", icon: BookOpen },
  { label: "Integrationer", value: "integrations", icon: Wifi },
  { label: "AI-analys", value: "ai", icon: Sparkles },
];

const UnifiedCommercePage = () => { const [activeTab, setActiveTab] = useState("overview");

  return (
    <div>
      <PageHeader
        icon={ShoppingCart}
        title="Unified Commerce"
        subtitle="Alla försäljningskanaler i ett system — automatisk bokföring, avstämning och AI-analys"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="px-8">
        {activeTab === "overview" && <UnifiedCommerceDashboard />}
        {activeTab === "transactions" && <CommerceTransactionExplorer />}
        {activeTab === "reconciliation" && <CommerceReconciliationCenter />}
        {activeTab === "accounting" && <CommerceAccountingPreview />}
        {activeTab === "integrations" && <CommerceIntegrationHub />}
        {activeTab === "ai" && <CommerceAIInsights />}
      </div>
    </div>
  );
};

export default UnifiedCommercePage;
