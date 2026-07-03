import PublicPlaceholderPage from "@/components/PublicPlaceholderPage";
import { Lock } from "lucide-react";
export default function PublicSecurityPage() {
  return <PublicPlaceholderPage title="Säkerhet" description="Bokfy är byggt med säkerhet i varje lager — bankgrad kryptering, rollbaserad åtkomst, revisionsloggar och säker drift i molnet." icon={Lock} />;
}
