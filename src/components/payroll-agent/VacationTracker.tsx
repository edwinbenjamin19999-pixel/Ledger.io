import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sun, AlertTriangle } from "lucide-react";

interface VacationTrackerProps { employees: any[];
}

export const VacationTracker = ({ employees }: VacationTrackerProps) => { const activeEmps = employees.filter((e) => e.is_active);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sun className="h-4 w-4 text-[#7A5417]" />
          Semesteröversikt
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeEmps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Inga aktiva anställda</p>
        ) : (
          <div className="space-y-4">
            {activeEmps.map((emp) => { const total = emp.vacation_days_per_year || 25;
              const used = emp.vacation_days_used || 0;
              const remaining = total - used;
              const percentage = (used / total) * 100;
              const isLow = remaining <= 5;

              return (
                <div key={emp.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {emp.first_name} {emp.last_name}
                      </span>
                      {isLow && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Få dagar kvar
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {remaining} av {total} dagar kvar
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Totalt semesterdagar kvar</span>
                <span className="font-bold">
                  {activeEmps.reduce((s, e) => s + ((e.vacation_days_per_year || 25) - (e.vacation_days_used || 0)), 0)} dagar
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Beräknad semesterskuld</span>
                <span className="font-bold">
                  {activeEmps
                    .reduce((s, e) => { const remaining = (e.vacation_days_per_year || 25) - (e.vacation_days_used || 0);
                      const dailyRate = (e.monthly_salary || 0) / 21.75;
                      return s + remaining * dailyRate * 1.3142;
                    }, 0)
                    .toLocaleString("sv-SE", { maximumFractionDigits: 0 })}{" "}
                  kr
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
