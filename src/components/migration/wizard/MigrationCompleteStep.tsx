import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, BarChart3, BookOpen, FileText } from "lucide-react";
import { MigrationState } from "../MigrationWizard";
import { useNavigate } from "react-router-dom";

interface Props { state: MigrationState;
  onFinish: () => void;
}

export const MigrationCompleteStep = ({ state, onFinish }: Props) => { const navigate = useNavigate();
  const summary = state.importSummary;

  return (
    <div className="space-y-6">
      <Card className="border-[#BFE6D6] dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#E1F5EE] dark:bg-emerald-900 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-[#085041]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Migrering slutförd!</h2>
            <p className="text-muted-foreground mt-1">All data har importerats och validerats. Ditt nya system är redo att användas.</p>
          </div>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              {[
                { label: "Konton", value: summary.accounts || 0 },
                { label: "Verifikationer", value: summary.verifications || 0 },
                { label: "Konteringsrader", value: summary.transactionLines || 0 },
                { label: "Historiska år", value: summary.historicalYears || 0 },
              ].map(s => (
                <div key={s.label} className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">Vad vill du göra nu?</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => navigate("/dashboard")}>
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Gå till Dashboard</span>
              <span className="text-[10px] text-muted-foreground">Se översikt av din bokföring</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => navigate("/chart-of-accounts")}>
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Granska kontoplan</span>
              <span className="text-[10px] text-muted-foreground">Kontrollera importerade konton</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => navigate("/verifications")}>
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Visa huvudbok</span>
              <span className="text-[10px] text-muted-foreground">Se importerade verifikationer</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button onClick={onFinish}>
          Klar <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
