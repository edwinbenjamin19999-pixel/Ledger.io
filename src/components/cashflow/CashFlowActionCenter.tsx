import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, CircleAlert, BarChart3, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CashFlowAlert } from "@/hooks/useCashFlow";

interface Props { alerts: CashFlowAlert[];
}

const iconMap = { risk: <AlertTriangle className="w-4 h-4 text-[#7A1A1A] shrink-0" />,
  due: <Calendar className="w-4 h-4 text-[#7A5417] shrink-0" />,
  overdue: <CircleAlert className="w-4 h-4 text-[#7A1A1A] shrink-0" />,
  concentration: <BarChart3 className="w-4 h-4 text-[#7A5417] shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const borderMap = { risk: "border-l-red-500",
  due: "border-l-amber-500",
  overdue: "border-l-red-500",
  concentration: "border-l-amber-400",
  info: "border-l-blue-400",
};

export function CashFlowActionCenter({ alerts }: Props) { const navigate = useNavigate();
  const displayed = alerts.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Att agera på</CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {alerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {displayed.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Inga aktiva varningar ✓
          </div>
        ) : (
          displayed.map(alert => (
            <button
              key={alert.id}
              onClick={() => alert.navigateTo && navigate(alert.navigateTo)}
              className={`w-full text-left rounded-lg border border-l-[3px] ${borderMap[alert.type]} bg-card p-3 hover:bg-muted/50 transition-colors`}
            >
              <div className="flex items-start gap-2">
                {iconMap[alert.type]}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground leading-tight">{alert.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{alert.description}</div>
                </div>
              </div>
            </button>
          ))
        )}
        {alerts.length > 5 && (
          <button className="text-[11px] text-primary hover:underline w-full text-center pt-1">
            Se alla ({alerts.length})
          </button>
        )}
      </CardContent>
    </Card>
  );
}
