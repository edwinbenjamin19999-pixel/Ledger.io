import { PageHeader } from "@/components/layout/PageHeader";
import { Truck } from "lucide-react";
import { SupplierWatchCard } from "@/components/workspace/hospitality/SupplierWatchCard";

export default function HospitalitySuppliersPage() {
  return (
    <div>
      <PageHeader
        icon={Truck}
        title="Leverantörsbevakning"
        subtitle="Prisförändringar, kategorier och rullande snitt — automatiskt från huvudboken"
      />
      <div className="px-8 pb-12">
        <SupplierWatchCard limit={50} />
      </div>
    </div>
  );
}
