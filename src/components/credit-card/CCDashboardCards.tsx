import { Card, CardContent } from "@/components/ui/card";
import { Receipt, CheckCircle2, AlertTriangle, FileQuestion, Send } from "lucide-react";

interface CCDashboardCardsProps {
  total: number;
  matched: number;
  missingReceipts: number;
  needsClarification: number;
  readyToPost: number;
}

export function CCDashboardCards({ total, matched, missingReceipts, needsClarification, readyToPost }: CCDashboardCardsProps) {
  const cards = [
    { label: "Totalt", value: total, icon: Receipt, color: "text-primary" },
    { label: "Matchade", value: matched, icon: CheckCircle2, color: "text-[#085041]" },
    { label: "Saknar kvitto", value: missingReceipts, icon: FileQuestion, color: "text-muted-foreground" },
    { label: "Behöver svar", value: needsClarification, icon: AlertTriangle, color: "text-[#7A5417]" },
    { label: "Redo att bokföra", value: readyToPost, icon: Send, color: "text-[#3b82f6]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-5 w-5 ${c.color} shrink-0`} />
            <div>
              <p className="text-2xl font-semibold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
