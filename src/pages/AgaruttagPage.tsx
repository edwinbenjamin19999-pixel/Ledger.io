import { AgaruttagDashboard } from "@/components/agaruttag/AgaruttagDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Landmark } from "lucide-react";

export default function AgaruttagPage() { return (
    <div>
      <PageHeader
        icon={Landmark}
        iconColor="from-[#0F1F3D] to-[#1E3A5F]"
        title="Ägaruttag & Kapitalplanering"
        subtitle="Utdelning, lön, K10 och periodiseringsfond"
      />
      <div className="px-8">
        <AgaruttagDashboard />
      </div>
    </div>
  );
}
