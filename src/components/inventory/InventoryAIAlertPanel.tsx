import { useNavigate } from "react-router-dom";
import { ActivationHero } from "@/components/shared/ActivationHero";
import { Package } from "lucide-react";

/**
 * Inventory activation hero — replaces silent `return null` with concrete
 * value proposition (Law 2 + Law 5). Shown when no articles exist yet.
 */
export const InventoryAIAlertPanel = () => {
  const navigate = useNavigate();
  return (
    <ActivationHero
      icon={Package}
      title="Aktivera lagerintelligens"
      valueProp="AI bokför lagervärde och inventering automatiskt enligt BAS 1460/4010 → sparar ~4h/månad och förhindrar svinn."
      steps={[
        { label: "Lägg upp dina artiklar i registret" },
        { label: "Importera försäljnings- och inköpsdata" },
        { label: "AI bevakar ROP, ABC-XYZ och svinn automatiskt" },
      ]}
      primaryCtaLabel="Lägg till artikel"
      onPrimaryCta={() => navigate("/lagerredovisning?tab=articles")}
      secondaryCtaLabel="Läs mer"
      onSecondaryCta={() => navigate("/lagerredovisning?tab=help")}
    />
  );
};
