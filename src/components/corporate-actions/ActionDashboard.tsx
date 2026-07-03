import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, PenTool, CheckCircle2, AlertTriangle, Archive } from "lucide-react";

interface DashboardKPI { label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

interface ActionDashboardProps { onFilterClick: (filter: string) => void;
  counts?: { total: number;
    draft: number;
    pending_signing: number;
    pending_approval: number;
    executed: number;
    archived: number;
  };
}

export const ActionDashboard = ({ onFilterClick, counts }: ActionDashboardProps) => { const c = counts ?? { total: 0, draft: 0, pending_signing: 0, pending_approval: 0, executed: 0, archived: 0 };

  const kpis: DashboardKPI[] = [
    { label: "Totalt", value: c.total, icon: FileText, color: "text-foreground" },
    { label: "Utkast", value: c.draft, icon: Clock, color: "text-[#7A5417]" },
    { label: "Väntar signering", value: c.pending_signing, icon: PenTool, color: "text-orange-600" },
    { label: "Väntar godkännande", value: c.pending_approval, icon: AlertTriangle, color: "text-purple-600" },
    { label: "Verkställda", value: c.executed, icon: CheckCircle2, color: "text-[#085041]" },
    { label: "Arkiverade", value: c.archived, icon: Archive, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => { const Icon = kpi.icon;
        return (
          <Card
            key={kpi.label}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => onFilterClick(kpi.label.toLowerCase())}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
              <Icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-2xl font-bold">{kpi.value}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
