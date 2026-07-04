import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Smartphone, FileText, Info } from "lucide-react";

const PRODUCTION_INTEGRATIONS = [
  {
    name: 'BankID via Signicat',
    status: 'demo' as const,
    requirement: 'Signicat API-avtal + mTLS-certifikat',
    contact: 'support@cogniq.se',
    icon: Shield,
  },
  {
    name: 'Swish Handel',
    status: 'coming_soon' as const,
    requirement: 'Swish Handel-avtal via din bank',
    contact: 'support@cogniq.se',
    icon: Smartphone,
  },
  {
    name: 'Skatteverket AGI/Moms (live)',
    status: 'active' as const,
    requirement: 'Ansluten via mTLS-certifikat',
    contact: 'support@cogniq.se',
    icon: FileText,
  },
];

const statusConfig = {
  demo: { label: 'Demo-läge', variant: 'outline' as const, className: 'bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]' },
  coming_soon: { label: 'Kommande', variant: 'outline' as const, className: 'bg-[#EFF6FF] text-blue-700 border-[#C8DDF5]' },
  active: { label: 'Aktiv', variant: 'default' as const, className: '' },
};

export const ProductionIntegrations = () => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4" />
          Produktionsintegrationer
        </CardTitle>
        <CardDescription>
          Status för externa integrationer som kräver separata avtal för produktionsdrift.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PRODUCTION_INTEGRATIONS.map((integration) => {
          const status = statusConfig[integration.status];
          const Icon = integration.icon;
          return (
            <div key={integration.name} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium">{integration.name}</p>
                  <Badge variant={status.variant} className={`text-[10px] ${status.className}`}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{integration.requirement}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kontakt: <span className="font-medium">{integration.contact}</span>
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
