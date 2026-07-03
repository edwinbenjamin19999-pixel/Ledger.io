import { UtdelningDashboard } from "@/components/utdelning/UtdelningDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Banknote } from "lucide-react";

export default function UtdelningLonPage() { return (
    <div>
      <PageHeader
        icon={Banknote}
        title="Utdelning och Lön"
        subtitle="Ta ut pengar från ditt AB på mest skatteeffektiva sätt"
      />
      <div className="px-8">
        <UtdelningDashboard />
      </div>
    </div>
  );
}
