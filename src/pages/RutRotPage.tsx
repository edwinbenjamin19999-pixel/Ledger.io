import { useState } from "react";
import { useRutRotSettings, useRutRotInvoices, useCustomerLimits } from "@/hooks/useRutRot";
import { RutRotSetup } from "@/components/rutrot/RutRotSetup";
import { RutRotDashboard } from "@/components/rutrot/RutRotDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Hammer } from "lucide-react";

const RutRotPage = () => { const { settings, isLoading } = useRutRotSettings();

  if (isLoading) { return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">Laddar...</p>
    </div>
    );
  }

  if (!settings || (!settings.rut_enabled && !settings.rot_enabled)) { return <RutRotSetup />;
  }

  return (
    <div>
      <PageHeader
        icon={Hammer}
        iconColor="from-[#0F1F3D] to-[#1E3A5F]"
        title="RUT/ROT-avdrag"
        subtitle="Hantera avdrag, ansökningar och kundgränser"
      />
      <div className="px-8">
        <RutRotDashboard settings={settings} />
      </div>
    </div>
  );
};

export default RutRotPage;
