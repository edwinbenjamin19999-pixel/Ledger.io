import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "yearend-banner-dismissed";

export function YearEndBanner() { const navigate = useNavigate();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const closingYear = new Date().getFullYear() - 1;

  // Show only in Q1 (Jan-Apr)
  if (currentMonth > 4) return null;

  const [dismissed, setDismissed] = useState(() => { const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    return new Date(stored).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  });

  if (dismissed) return null;

  const handleDismiss = () => { localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setDismissed(true);
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            Dags att stänga {closingYear} — din årsassistent väntar
          </p>
          <p className="text-xs text-muted-foreground">
            Ladda upp kvitton, matcha banktransaktioner och hitta avdrag
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/arsavstamning")}>
          Starta
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
