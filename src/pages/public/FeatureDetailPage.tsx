import PublicPlaceholderPage from "@/components/PublicPlaceholderPage";
import { Bot, Zap, BarChart3 } from "lucide-react";
import { useParams } from "react-router-dom";

const featureMap: Record<string, { title: string; description: string; icon: typeof Bot }> = {
  "ai-assistant": { title: "AI-assistent", description: "Ledger.io:s AI-assistent hjälper dig med bokföringsfrågor, konterar automatiskt och ger intelligenta förslag baserat på ditt företags historik.", icon: Bot },
  "accounting-automation": { title: "Automatiserad bokföring", description: "Låt AI hantera kontering, bankavstämning och momsberäkning automatiskt. Spara timmar varje månad med smart automation.", icon: Zap },
  "budget-forecast": { title: "Budget & Prognos", description: "Skapa AI-drivna budgetar och prognoser baserade på historisk data. Jämför scenarier och fatta bättre affärsbeslut.", icon: BarChart3 },
};

export default function FeatureDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const feature = featureMap[slug || ""] || { title: "Funktion", description: "Denna funktion beskrivs snart i detalj.", icon: Bot };
  return <PublicPlaceholderPage title={feature.title} description={feature.description} icon={feature.icon} />;
}
