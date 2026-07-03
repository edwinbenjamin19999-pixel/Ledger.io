import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, CheckCircle } from "lucide-react";
import type { FixedAsset } from "@/hooks/useAssets";

interface AIActionCenterProps { missingDepreciation: FixedAsset[];
  fullyDepreciated: FixedAsset[];
  onSelectAsset: (id: string) => void;
}

export const AIActionCenter = ({ missingDepreciation, fullyDepreciated, onSelectAsset }: AIActionCenterProps) => { const actions = [
    ...(missingDepreciation.length > 0
      ? [{ severity: "red" as const,
          icon: AlertTriangle,
          text: `${missingDepreciation.length} tillgång${missingDepreciation.length > 1 ? "ar" : ""} saknar avskrivning`,
          items: missingDepreciation,
        }]
      : []),
    ...(fullyDepreciated.length > 0
      ? [{ severity: "green" as const,
          icon: CheckCircle,
          text: `${fullyDepreciated.length} tillgång${fullyDepreciated.length > 1 ? "ar" : ""} fullt avskrivna`,
          items: fullyDepreciated,
        }]
      : []),
  ];

  if (actions.length === 0) return null;

  const severityStyles = { red: "border-destructive/30 bg-destructive/5",
    yellow: "border-[#F0DDB7] bg-[#FAEEDA]",
    green: "border-[#BFE6D6] bg-[#E1F5EE]",
  };

  const iconStyles = { red: "text-destructive",
    yellow: "text-[#7A5417]",
    green: "text-[#085041]",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">AI-insikter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action, i) => (
          <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${severityStyles[action.severity]}`}>
            <div className="flex items-center gap-2">
              <action.icon className={`w-4 h-4 ${iconStyles[action.severity]}`} />
              <span className="text-sm">{action.text}</span>
            </div>
            {action.items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => onSelectAsset(action.items[0].id)}>
                Visa
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
