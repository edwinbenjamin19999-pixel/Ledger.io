import heroDashboard from "@/assets/hero-dashboard.png";

export const HeroProductMockup = () => {
  return (
    <div className="relative w-full">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.16) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative overflow-hidden rounded-2xl border border-white/10"
        style={{
          transform: "perspective(1400px) rotateX(3deg)",
          transformOrigin: "top center",
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <img
          src={heroDashboard}
          alt="NorthLedger dashboardöversikt"
          className="block w-full h-auto"
          loading="eager"
        />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050d1a] to-transparent pointer-events-none" />
      </div>

      <p className="text-white/25 text-xs text-center mt-4">
        Riktiga siffror. Alltid uppdaterade. Ingen manuell bokföring.
      </p>
    </div>
  );
};