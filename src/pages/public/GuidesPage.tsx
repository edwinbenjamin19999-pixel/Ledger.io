import PublicPlaceholderPage from "@/components/PublicPlaceholderPage";
import { BookOpen } from "lucide-react";
import { useLocation } from "react-router-dom";

const guidesMap: Record<string, { title: string; description: string }> = {
  "/resources/ai-bookkeeping": { title: "AI-bokföring förklarat", description: "Lär dig hur artificiell intelligens kan automatisera din bokföring, minska fel och spara tid för ditt företag." },
  "/resources/vat-guide": { title: "Svensk momsguide", description: "En komplett guide till svensk moms — momsperioder, avdrag, EU-moms och hur Cogniq hanterar momsberäkning automatiskt." },
  "/resources/accounting-guides": { title: "Bokföringsguider", description: "Praktiska guider om bokföring, BAS-kontoplan, K2/K3-regler och allt du behöver veta för att sköta din redovisning korrekt." },
  "/resources/accounting-compliance": { title: "Regelefterlevnad", description: "Information om hur Cogniq följer svensk redovisningsstandard, BAS-kontoplan och K2/K3-regelverk." },
};

export default function GuidesPage() {
  const { pathname } = useLocation();
  const guide = guidesMap[pathname] || { title: "Resurser & Guider", description: "Utforska våra guider och resurser om bokföring, moms och AI-driven redovisning." };
  return <PublicPlaceholderPage title={guide.title} description={guide.description} icon={BookOpen} />;
}
