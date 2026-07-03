import { usePosConnection } from "@/hooks/useKassaregister";
import { PosSetupFlow } from "@/components/kassaregister/PosSetupFlow";
import { KassaDashboard } from "@/components/kassaregister/KassaDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreditCard } from "lucide-react";

const KassaregisterPage = () => { const { connection, isLoading } = usePosConnection();

  return (
    <div>
      <PageHeader
        icon={CreditCard}
        title="Kassaregister (POS)"
        subtitle="Kassaförsäljning kopplad direkt till bokföringen"
      />
      <div className="px-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !connection ? (
          <PosSetupFlow />
        ) : (
          <KassaDashboard connection={connection} />
        )}
      </div>
    </div>
  );
};

export default KassaregisterPage;
