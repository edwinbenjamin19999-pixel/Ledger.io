import { EgetKapitalDashboard } from "@/components/eget-kapital/EgetKapitalDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Wallet } from "lucide-react";

export default function EgetKapitalPage() { return (
    <div>
      <PageHeader
        icon={Wallet}
        title="Eget kapital och uttag"
        subtitle="Se hur mycket du kan ta ut och håll koll på dina skattereserver"
      />
      <div className="px-8">
        <EgetKapitalDashboard />
      </div>
    </div>
  );
}
