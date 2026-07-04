import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Props { totalDeadlines: number;
  completedDeadlines: number;
  overdueDeadlines: number;
  activeAlerts: number;
  dismissedAlerts: number;
}

export function ComplianceScoreCard({ totalDeadlines, completedDeadlines, overdueDeadlines, activeAlerts, dismissedAlerts }: Props) { // Score: 100 - (overdue * 15) - (activeAlerts * 5), min 0
  const score = Math.max(0, Math.min(100, 100 - overdueDeadlines * 15 - activeAlerts * 3));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 50 ? "C" : "D";
  const gradeColor = score >= 90 ? "text-primary" : score >= 75 ? "text-blue-600" : score >= 50 ? "text-[#7A5417]" : "text-destructive";
  const bgRing = score >= 90 ? "stroke-primary" : score >= 75 ? "stroke-blue-500" : score >= 50 ? "stroke-amber-500" : "stroke-destructive";

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-6">
          {/* Large score ring */}
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                className={bgRing}
                strokeWidth="6"
                strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${gradeColor}`}>{grade}</span>
              <span className="text-[10px] text-muted-foreground">{score}/100</span>
            </div>
          </div>

          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Efterlevnadspoäng</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" /> {completedDeadlines} klara
              </span>
              {overdueDeadlines > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" /> {overdueDeadlines} försenade
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-[#7A5417]" /> {activeAlerts} aktiva varningar
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {score >= 90
                ? "Utmärkt efterlevnad — inga åtgärder krävs."
                : score >= 75
                ? "God efterlevnad — några punkter att åtgärda."
                : score >= 50
                ? "Förbättringsområden identifierade — åtgärda försenade deadlines."
                : "Kritiska efterlevnadsproblem — omedelbar åtgärd krävs."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
