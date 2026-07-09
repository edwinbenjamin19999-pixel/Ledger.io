import { useNavigate } from "react-router-dom";

/**
 * Avslutande CTA-band (Cogniq Design System): "Sluta bokföra. Börja driva."
 * Solid Electric Blue yta.
 */
export const ClosingCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-[#0052FF] px-6 py-24 text-center md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(600px 300px at 50% 120%, rgba(255,255,255,0.14), transparent 60%)" }}
      />
      <div className="relative mx-auto max-w-2xl">
        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
          Sluta bokföra. Börja driva.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-white/80">
          Kom igång på minuter. Cogniq migrerar din historik gratis.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-7 text-[15px] font-semibold text-[#0052FF] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0052FF] sm:w-auto"
          >
            Kom igång gratis
          </button>
          <button
            onClick={() => navigate("/contact")}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/40 bg-white/10 px-7 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0052FF] sm:w-auto"
          >
            Boka demo
          </button>
        </div>
      </div>
    </section>
  );
};
