import {
  Activity, Bot, CheckCircle2, FileText, BarChart3, Landmark,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, type EmptyStateAction } from "./EmptyState";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

type Variant = "dashboard" | "ai-activity" | "reconciliation" | "invoices" | "reports";

interface Props {
  variant: Variant;
  /** Override actions (e.g. for reports' "Change period"). */
  extraAction?: EmptyStateAction;
  inline?: boolean;
}

/**
 * Onboarding-aware empty state. If the bank isn't connected and the variant
 * depends on transactions, the bank-connect copy takes precedence so users
 * always know the *root cause* and the *next action*.
 */
export const OnboardingEmptyState = ({ variant, extraAction, inline }: Props) => {
  const { bankConnected, loading } = useOnboardingProgress();

  if (loading) return null;

  const transactionDependent = variant === "dashboard" || variant === "reconciliation" || variant === "reports";

  if (transactionDependent && !bankConnected) {
    return (
      <EmptyState
        inline={inline}
        icon={Landmark}
        title="Anslut din bank för att aktivera detta."
        description="Utan bankdata kan jag inte matcha eller analysera dina transaktioner."
        actions={[
          { label: "Anslut bank", to: "/bank" },
          { label: "Ladda upp SIE-fil", to: "/welcome", variant: "outline" },
        ]}
      />
    );
  }

  const map: Record<Variant, { icon: LucideIcon; title: string; description?: string; actions: EmptyStateAction[] }> = {
    dashboard: {
      icon: Activity,
      title: "Jag har inga transaktioner att analysera ännu.",
      description: "Anslut din bank eller ladda upp en SIE-fil för att komma igång.",
      actions: [
        { label: "Anslut bank", to: "/bank" },
        { label: "Ladda upp SIE-fil", to: "/welcome", variant: "outline" },
      ],
    },
    "ai-activity": {
      icon: Bot,
      title: "Jag har inte gjort något automatiskt ännu — det börjar så snart transaktioner flödar in.",
      actions: [
        { label: "Anslut bank", to: "/bank" },
      ],
    },
    reconciliation: {
      icon: CheckCircle2,
      title: "Alla transaktioner är matchade.",
      description: "Nästa avstämning sker automatiskt när nya transaktioner kommer in.",
      actions: [
        { label: "Visa bankkonton", to: "/bank", variant: "outline" },
      ],
    },
    invoices: {
      icon: FileText,
      title: "Inga fakturor ännu.",
      description: "Skapa din första kundfaktura eller ladda upp en leverantörsfaktura.",
      actions: [
        { label: "Ny kundfaktura", to: "/invoices/new" },
        { label: "Ladda upp leverantörsfaktura", to: "/supplier-invoices", variant: "outline" },
      ],
    },
    reports: {
      icon: BarChart3,
      title: "Rapporten kräver bokförda transaktioner för vald period.",
      description: "Byt period eller importera historisk data för att se rapporten.",
      actions: [
        { label: "Importera data", to: "/welcome" },
      ],
    },
  };

  const cfg = map[variant];
  const actions = extraAction ? [extraAction, ...cfg.actions] : cfg.actions;
  return <EmptyState inline={inline} icon={cfg.icon} title={cfg.title} description={cfg.description} actions={actions} />;
};

export default OnboardingEmptyState;
