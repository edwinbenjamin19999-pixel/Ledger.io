import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HeroProductMockup } from "./HeroProductMockup";
import { useWaitlistCount, incrementWaitlist } from "@/hooks/useWaitlistCount";

/**
 * FLAT SIGNUP-BLOCK — solitt ink-navy, inga glows/mönster/pulser.
 * Vita platta inputs på mörk yta, vit CTA med skala + färgskifte.
 */
export const CountdownCTA = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const { count } = useWaitlistCount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Ange en giltig e-postadress");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      email: trimmed,
      name: name.trim() || null,
      source: "landing_countdown",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info("Du är redan registrerad!");
      else toast.error("Något gick fel. Försök igen.");
    } else {
      toast.success("Du är på listan! Vi hör av oss.");
      setEmail("");
      setName("");
      incrementWaitlist(1);
    }
  };

  return (
    <section
      id="signup"
      className="relative overflow-hidden bg-[#F5F8FF] py-24 md:py-32 scroll-mt-20"
    >
      {/* Ljus, luftig yta — mjuk blå glow, ingen tung textur */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.5) 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.025 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#0052FF] opacity-[0.07] blur-[150px]"
      />

      <div className="relative z-10 container mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F172A] leading-[1.05] mb-4">
          Sluta betala för system som inte tänker.
        </h2>
        <p className="text-slate-600 text-xl mb-3">
          Pilotfas pågår — begränsat antal platser.
        </p>
        <p className="text-slate-500 text-base mb-8 max-w-lg mx-auto leading-relaxed">
          De flesta ekonomisystem bokför bakåt. Cogniq är byggt för att se
          framåt — prognos, avvikelser och beslut, inte bara verifikat. Vi tar
          in ett begränsat antal pilotbolag inför lansering Q3 2026.
        </p>

        {/* Live signup counter */}
        <p className="mb-6 text-sm font-semibold text-slate-700">
          <span
            aria-hidden
            className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle"
          />
          <span className="tabular-nums">{count.toLocaleString("sv-SE")}</span>{" "}
          företag redan anmälda
        </p>

        {/* Form — vita platta fält på navy */}
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-3">
          <label htmlFor="cta-name" className="sr-only">Ditt namn (valfritt)</label>
          <input
            id="cta-name"
            type="text"
            autoComplete="name"
            placeholder="Ditt namn (valfritt)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-[15px] text-[#0F172A] placeholder:text-[#0F172A]/40 focus:border-[#0052FF] focus:outline-none transition-colors duration-200"
          />
          <label htmlFor="cta-email" className="sr-only">E-postadress</label>
          <input
            id="cta-email"
            type="email"
            required
            autoComplete="email"
            placeholder="din@email.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-[15px] text-[#0F172A] placeholder:text-[#0F172A]/40 focus:border-[#0052FF] focus:outline-none transition-colors duration-200"
          />
          <button
            type="submit"
            disabled={loading}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0052FF] text-base font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0040CC] hover:shadow-accent-lg disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F8FF]"
          >
            {loading ? "Skickar..." : "Ansök till piloten"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
          <p className="mt-3 text-xs font-medium tracking-wide text-slate-500">
            ✓ 14 dagar gratis · ✓ Ingen bindningstid
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-slate-400">
            Din data lagras på svenska servrar, krypteras i vila och transit,
            och delas aldrig med tredje part.
          </p>
        </form>

        {/* Princip-rad — ljust kort */}
        <div className="mx-auto mt-12 mb-12 max-w-2xl rounded-lg border border-slate-200 bg-white px-8 py-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-center text-center md:text-left">
            <span className="text-base font-bold text-[#0F172A]">
              AI bokför — du godkänner.
            </span>
            <span aria-hidden className="mx-6 hidden text-slate-300 md:inline">·</span>
            <span className="mt-2 text-sm text-slate-500 md:mt-0">
              Varje post är granskbar, spårbar och alltid i linje med bokföringslagen.
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-4 w-full max-w-[1600px] px-6 pb-8">
        <HeroProductMockup />
      </div>
    </section>
  );
};
