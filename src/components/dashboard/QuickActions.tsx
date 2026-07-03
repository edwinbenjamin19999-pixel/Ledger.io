import { Upload, FileText, TrendingUp, Zap, BookOpen, Search, ClipboardList, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { title: "Ladda upp dokument", description: "AI analyserar och bokar", icon: Upload, path: "/accounting" },
  { title: "Automatisering", description: "AGI, moms & bokslut", icon: Zap, path: "/automation" },
  { title: "Skapa faktura", description: "Enkelt med mallar", icon: FileText, path: "/invoices" },
  { title: "Rapporter", description: "Resultat & balans", icon: TrendingUp, path: "/reports" },
  { title: "Kontoplan", description: "BAS 2026", icon: BookOpen, path: "/chart-of-accounts" },
  { title: "Kontoanalys", description: "Saldon & verifikationer", icon: Search, path: "/account-analysis" },
  { title: "Verifikationer", description: "Alla bokförda poster", icon: ClipboardList, path: "/verifications" },
  { title: "Utlägg", description: "Registrera & följ upp", icon: Receipt, path: "/expenses" },
];

export const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-muted/40 border border-border rounded-2xl p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-foreground font-semibold text-[15px] tracking-[-0.01em]">Snabbåtgärder</h3>
        <p className="text-muted-foreground text-xs mt-0.5">Här är vad jag förberett åt dig</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className="group bg-card border border-border hover:border-teal-400/40 hover:shadow-[0_4px_12px_rgba(20,184,166,0.08)] hover:-translate-y-0.5 rounded-xl p-4 cursor-pointer transition-all duration-[160ms] ease-out flex flex-col items-center gap-3 text-center active:scale-[0.99]"
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-muted/60 border border-border group-hover:border-teal-400/40 transition-colors">
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-teal-500 transition-colors" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-foreground font-medium text-xs leading-tight tracking-[-0.01em]">{action.title}</p>
                <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
