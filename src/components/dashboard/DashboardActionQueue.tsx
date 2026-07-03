import { AlertTriangle, Send, FileSearch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DashboardActionQueueProps {
  companyId: string;
}

const actions = [
  {
    icon: Send,
    title: "Moms redo att skickas",
    description: "April 2026 — 42 180 kr",
    severity: "warning" as const,
    cta: "Skicka moms",
    route: "/moms",
  },
  {
    icon: FileSearch,
    title: "1 faktura obetald",
    description: "Förfallen 3 dagar — 15 000 kr",
    severity: "error" as const,
    cta: "Granska faktura",
    route: "/invoices",
  },
];

export const DashboardActionQueue = ({ companyId }: DashboardActionQueueProps) => {
  const navigate = useNavigate();

  if (actions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-[#7A5417]" />
        <h3 className="text-sm font-semibold text-foreground">Detta behöver din uppmärksamhet</h3>
      </div>
      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.title}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                action.severity === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-[#FAEEDA] text-[#7A5417]"
              }`}
            >
              <action.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-shrink-0"
              onClick={() => navigate(action.route)}
            >
              {action.cta}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
