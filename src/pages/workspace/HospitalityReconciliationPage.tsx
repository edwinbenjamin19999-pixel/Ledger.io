import { PageHeader } from "@/components/layout/PageHeader";
import { ArrowLeftRight } from "lucide-react";
import { ReconciliationQueue } from "@/components/workspace/hospitality/ReconciliationQueue";

export default function HospitalityReconciliationPage() {
  return (
    <div>
      <PageHeader
        icon={ArrowLeftRight}
        title="Avstämning — POS mot bank"
        subtitle="Matcha dagskassor mot bankinflöde med tolerans ±2 dagar och ±1%"
      />
      <div className="px-8 pb-12">
        <ReconciliationQueue limit={60} />
      </div>
    </div>
  );
}
