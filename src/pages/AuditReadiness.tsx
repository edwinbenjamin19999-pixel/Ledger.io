import { AuditReadiness } from "@/components/audit-readiness/AuditReadiness";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShieldCheck } from "lucide-react";

const AuditReadinessPage = () => { return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Kontinuerlig Revisionsförberedelse"
        subtitle="Revisionsredo 365 dagar om året — automatisk dokumentation och avstämning"
      />
      <div className="px-8">
        <AuditReadiness />
      </div>
    </div>
  );
};

export default AuditReadinessPage;
