import heroDashboard from "@/assets/hero-dashboard.png";

/**
 * FLAT PRODUKT-MOCKUP — vit platt ram, inga skuggor, ingen 3D-perspektiv.
 * Kontrasten mot mörk sektion gör jobbet.
 */
export const HeroProductMockup = () => {
  return (
    <div className="relative w-full">
      <div className="overflow-hidden border-2 border-background bg-background">
        <img
          src={heroDashboard}
          alt="Bokfy dashboardöversikt"
          className="block w-full h-auto grayscale contrast-110"
          loading="eager"
        />
      </div>
      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-widest text-background/50">
        Riktiga siffror. Alltid uppdaterade. Ingen manuell bokföring.
      </p>
    </div>
  );
};
