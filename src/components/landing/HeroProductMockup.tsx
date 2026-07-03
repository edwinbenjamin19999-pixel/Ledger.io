import heroDashboard from "@/assets/hero-dashboard.png";

/**
 * FLAT PRODUKT-MOCKUP — vit platt ram, inga skuggor, ingen 3D-perspektiv.
 * Kontrasten mot mörk sektion gör jobbet.
 */
export const HeroProductMockup = () => {
  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-lg bg-white p-1.5">
        <img
          src={heroDashboard}
          alt="Ledger.io dashboardöversikt"
          className="block w-full h-auto rounded-md"
          loading="eager"
        />
      </div>
      <p className="text-white/50 text-xs text-center mt-4">
        Riktiga siffror. Alltid uppdaterade. Ingen manuell bokföring.
      </p>
    </div>
  );
};
