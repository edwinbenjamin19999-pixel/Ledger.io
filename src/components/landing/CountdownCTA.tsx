import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HeroProductMockup } from "./HeroProductMockup";
import { useWaitlistCount, incrementWaitlist } from "@/hooks/useWaitlistCount";

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
    <section id="signup" className="relative py-32 md:py-40 overflow-hidden scroll-mt-20">
      {/* Subtle line pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.15) 59px, rgba(255,255,255,0.15) 60px)",
        }}
      />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(8,145,178,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(8,145,178,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(29,217,240,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 container mx-auto max-w-2xl px-6 text-center">
        <style>{`
          .cta-input,
          .cta-input:hover,
          .cta-input:focus,
          .cta-input:active {
            appearance: none;
            background-color: rgba(255,255,255,0.06) !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            caret-color: #ffffff !important;
            transition: border-color 150ms ease;
            border-left: 2px solid transparent;
          }
          .cta-input:focus { border-left: 2px solid #3b82f6; }
          .cta-input:-webkit-autofill,
          .cta-input:-webkit-autofill:hover,
          .cta-input:-webkit-autofill:focus,
          .cta-input:-webkit-autofill:active {
            background-color: rgba(255,255,255,0.06) !important;
            background-clip: content-box !important;
            -webkit-text-fill-color: #ffffff !important;
            -webkit-box-shadow: 0 0 0 1000px #17263a inset !important;
            box-shadow: 0 0 0 1000px #17263a inset !important;
            caret-color: #ffffff !important;
            transition: background-color 9999s ease-in-out 0s;
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(29,217,240,0.3); }
            50% { box-shadow: 0 0 35px rgba(29,217,240,0.55); }
          }
          .cta-pulse { animation: pulse-glow 2.5s ease-in-out infinite; }
        `}</style>

        <h2
          className="text-4xl md:text-5xl font-bold text-white leading-[1.05] mt-2 mb-4"
          style={{ letterSpacing: "-0.8px" }}
        >
          Sluta betala för system som inte tänker.
        </h2>
        <p className="text-white/70 font-normal text-xl text-center mb-4">
          Pilotfas pågår — begränsat antal platser.
        </p>

        <p className="text-white/50 text-lg text-center mb-8">
          De flesta ekonomisystem är byggda på 20 år gammal grund — med AI tillagt i efterhand. NorthLedger är byggt från grunden med AI som motor. Early access är begränsat.
        </p>

        {/* Live signup counter */}
        <p className="text-[#3b82f6] text-sm font-medium text-center mb-4">
          🟢{" "}
          <span className="inline-block tabular-nums">
            {count.toLocaleString("sv-SE")}
          </span>{" "}
          företag redan anmälda
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto w-full space-y-3">
          <input
            type="text"
            placeholder="Ditt namn (valfritt)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ WebkitTextFillColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.06)", color: "#ffffff", colorScheme: "dark" }}
            className="cta-input w-full h-11 px-3 !bg-white/[0.06] border border-[rgba(255,255,255,0.15)] !text-white text-[15px] placeholder:text-white/50 focus:border-[#3b82f6]/60 focus:outline-none rounded-lg"
          />
          <input
            type="email"
            required
            placeholder="din@email.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ WebkitTextFillColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.06)", color: "#ffffff", colorScheme: "dark" }}
            className="cta-input w-full h-11 px-3 !bg-white/[0.06] border border-[rgba(255,255,255,0.15)] !text-white text-[15px] placeholder:text-white/50 focus:border-[#3b82f6]/60 focus:outline-none rounded-lg"
          />
          <Button
            type="submit"
            disabled={loading}
            className="cta-pulse w-full h-11 bg-white hover:bg-white/90 text-[#050d1a] font-semibold rounded-lg group"
          >
            {loading ? "Skickar..." : "Säkra din plats"}
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <p className="text-white/25 text-[11px] tracking-wide text-center mt-3">
            ✓ 14 dagar gratis  ·  ✓ Ingen bindningstid
          </p>
          <p className="text-white/25 text-[11px] text-center mt-2 max-w-sm mx-auto">
            Din data lagras på svenska servrar, krypteras i vila och transit, och delas aldrig med tredje part.
          </p>
        </form>


        <div className="bg-[#0a1a2e] border border-white/5 rounded-xl px-8 py-4 max-w-2xl mx-auto mt-12 mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-center text-center md:text-left">
            <span className="text-white font-semibold text-base">
              AI bokför — du godkänner.
            </span>
            <span aria-hidden className="hidden md:inline text-white/15 mx-6">·</span>
            <span className="text-white/45 text-sm mt-2 md:mt-0">
              Varje post är granskbar, spårbar och alltid i linje med bokföringslagen.
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 mt-12 pb-8">
        <HeroProductMockup />
      </div>
    </section>
  );
};
