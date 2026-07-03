import { useNavigate } from "react-router-dom";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  TrendingUp,
  Wallet,
  LineChart,
  Calendar,
  Lock,
  Receipt,
  Calculator,
  Users,
  FileInput,
  Truck,
  Banknote,
  FolderOpen,
  CreditCard,
  Camera,
  Scale,
  AlertTriangle,
  Brain,
  ShieldCheck,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";

interface FeatureRow {
  tab: string;
  label: string;
  icon: LucideIcon;
  category: "Bokföring" | "Rapport" | "Skatt" | "Lön" | "Fakturor" | "Bank" | "AI";
}

/** Alla 26 klient-tabbar tillgängliga inuti WL-arbetsytan */
const FEATURES: FeatureRow[] = [
  { tab: "overview", label: "Översikt", icon: LayoutDashboard, category: "Bokföring" },
  { tab: "accounting", label: "Bokföring", icon: BookOpen, category: "Bokföring" },
  { tab: "verifications", label: "Verifikationer", icon: FileText, category: "Bokföring" },
  { tab: "income", label: "Resultaträkning", icon: TrendingUp, category: "Rapport" },
  { tab: "balance", label: "Balansräkning", icon: Scale, category: "Rapport" },
  { tab: "cashflow", label: "Kassaflöde", icon: Wallet, category: "Rapport" },
  { tab: "forecast", label: "Kassaflödesprognos", icon: LineChart, category: "Rapport" },
  { tab: "periodisering", label: "Periodisering", icon: Calendar, category: "Bokföring" },
  { tab: "closing", label: "Bokslut", icon: Lock, category: "Bokföring" },
  { tab: "vat", label: "Moms", icon: Receipt, category: "Skatt" },
  { tab: "tax", label: "Skatteberäkning", icon: Calculator, category: "Skatt" },
  { tab: "payroll", label: "Lön / HR", icon: Users, category: "Lön" },
  { tab: "agi", label: "AGI", icon: FileInput, category: "Lön" },
  { tab: "invoices", label: "Kundfakturor", icon: FileText, category: "Fakturor" },
  { tab: "supplier-invoices", label: "Leverantörsfakturor", icon: Truck, category: "Fakturor" },
  { tab: "supplier-ledger", label: "Lev.reskontra", icon: PiggyBank, category: "Fakturor" },
  { tab: "bank", label: "Bankintegration", icon: Banknote, category: "Bank" },
  { tab: "documents", label: "Dokument", icon: FolderOpen, category: "AI" },
  { tab: "payments", label: "Direktbetalningar", icon: CreditCard, category: "Bank" },
  { tab: "receipt-agent", label: "AI Kvittohantering", icon: Camera, category: "AI" },
  { tab: "ar-agent", label: "AI Kundreskontra", icon: Scale, category: "AI" },
  { tab: "anomalies", label: "Anomalier", icon: AlertTriangle, category: "AI" },
  { tab: "ai-ekonom", label: "AI-ekonom", icon: Brain, category: "AI" },
  { tab: "approvals", label: "Godkännanden", icon: ShieldCheck, category: "Bokföring" },
];

const CATEGORY_TONE: Record<FeatureRow["category"], string> = {
  Bokföring: "bg-slate-100 text-slate-700",
  Rapport: "bg-[#EFF6FF] text-[#3b82f6]",
  Skatt: "bg-[#FAEEDA] text-[#7A5417]",
  Lön: "bg-[#E1F5EE] text-[#085041]",
  Fakturor: "bg-[#EFF6FF] text-blue-700",
  Bank: "bg-[#F1F5F9] text-violet-700",
  AI: "bg-fuchsia-50 text-fuchsia-700",
};

/**
 * Översikt över alla klient-funktioner som finns i WL-arbetsytan.
 * Klick på en rad öppnar funktionen för aktiv klient (eller den första
 * tillgängliga klienten om ingen är vald).
 */
export const WLFeatureMatrix = () => {
  const navigate = useNavigate();
  const { clients } = useAdvisorContext();
  const { activeClient } = useAdvisorActiveClient();

  const targetClientId = activeClient?.id ?? clients[0]?.id ?? null;
  const targetClientName = activeClient?.name ?? clients[0]?.name ?? null;

  const open = (tab: string) => {
    if (!targetClientId) return;
    navigate(`/wl/app/clients/${targetClientId}/${tab}`);
  };

  return (
    <Card className="p-5 bg-white border-slate-200">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">
            Funktionsmatris
          </p>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Alla klient-funktioner
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {targetClientName
              ? `Klick öppnar funktionen för ${targetClientName}.`
              : "Välj en klient i sidopanelen för att öppna funktioner."}
          </p>
        </div>
        <div className="text-[11px] text-slate-500">
          {FEATURES.length} funktioner · samma motor som Bokfy standard
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {FEATURES.map((f) => (
          <button
            key={f.tab}
            disabled={!targetClientId}
            onClick={() => open(f.tab)}
            className="text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-[#3b82f6] hover:bg-blue-50/30 disabled:opacity-50 disabled:cursor-not-allowed transition group"
          >
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-white">
                <f.icon className="h-4 w-4 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-slate-900 truncate">
                  {f.label}
                </div>
                <span
                  className={`inline-block mt-0.5 text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${CATEGORY_TONE[f.category]}`}
                >
                  {f.category}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
};

export default WLFeatureMatrix;
