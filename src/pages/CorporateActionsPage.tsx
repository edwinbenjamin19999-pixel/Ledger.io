import { CorporateActionsModule } from "@/components/corporate-actions/CorporateActionsModule";
import { PageHeader } from "@/components/layout/PageHeader";
import { Landmark } from "lucide-react";

const CorporateActionsPage = () => { return (
    <div>
      <PageHeader
        icon={Landmark}
        title="Företagshändelser"
        subtitle="AI-driven hantering av bolagshändelser — juridik, bokföring och dokumentation i ett flöde"
      />
      <div className="px-8">
        <CorporateActionsModule />
      </div>
    </div>
  );
};

export default CorporateActionsPage;
