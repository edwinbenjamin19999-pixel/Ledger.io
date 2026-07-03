import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LAUNCH_DATE = new Date("2026-05-04T09:00:00+02:00");

function useCountdown(target: Date) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const valueBadges = [
  "Skatteverket-kompatibel",
  "Bankintegration (SEB, Nordea, SHB, Swedbank)",
  "BAS 2026",
  "Full revisionslogg",
  "Spårbar AI",
];

const trustItems = ["Skatteverket", "BankID", "GDPR", "BAS 2026"];

const processingSteps = [
  { text: "Analyserar transaktion...", delay: 300 },
  { text: "Identifierar kostnadstyp...", delay: 600 },
  { text: "Kontrollerar momsregler...", delay: 900 },
  { text: "Matchar mot konto...", delay: 1200 },
];

const resultSteps = [
  { text: "Konto: 5010 Hyra", delay: 1500 },
  { text: "Moms: Ej tillämplig", delay: 1800 },
  { text: "Bokförd", delay: 2100 },
  { text: "Matchad mot bank", delay: 2400 },
];

const TYPING_TEXT = "Betalade hyra 8 500 kr";

export const CenteredHero = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const countdown = useCountdown(LAUNCH_DATE);

  const [typedChars, setTypedChars] = useState(0);
  const [visibleProcessing, setVisibleProcessing] = useState(0);
  const [visibleResults, setVisibleResults] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const [demoPhase, setDemoPhase] = useState<"typing" | "processing" | "responding" | "done">("typing");

  const runDemo = useCallback(() => {
    setTypedChars(0);
    setVisibleProcessing(0);
    setVisibleResults(0);
    setShowFinal(false);
    setDemoPhase("typing");

    for (let i = 0; i <= TYPING_TEXT.length; i++) {
      setTimeout(() => setTypedChars(i), 80 * i);
    }

    const typeEnd = 80 * TYPING_TEXT.length + 400;
    setTimeout(() => setDemoPhase("processing"), typeEnd);

    processingSteps.forEach((step, idx) => {
      setTimeout(() => setVisibleProcessing(idx + 1), typeEnd + step.delay);
    });

    const processEnd = typeEnd + 1200;
    setTimeout(() => setDemoPhase("responding"), processEnd);

    resultSteps.forEach((step, idx) => {
      setTimeout(() => setVisibleResults(idx + 1), typeEnd + step.delay);
    });

    setTimeout(() => {
      setShowFinal(true);
      setDemoPhase("done");
    }, typeEnd + 3000);
  }, []);

  useEffect(() => {
    runDemo();
    const interval = setInterval(runDemo, 12000);
    return () => clearInterval(interval);
  }, [runDemo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      email: email.trim(),
      name: name.trim() || null,
      company_name: companyName.trim() || null,
      source: "landing_page",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info("Du är redan registrerad!");
      else toast.error("Något gick fel. Försök igen.");
    } else {
      toast.success("Du är på listan! Vi hör av oss.");
      setEmail("");
      setName("");
      setCompanyName("");
    }
  };

  const countdownBoxes = useMemo(
    () => [
      { value: countdown.days, label: "Dagar" },
      { value: countdown.hours, label: "Timmar" },
      { value: countdown.minutes, label: "Min" },
      { value: countdown.seconds, label: "Sek" },
    ],
    [countdown]
  );

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[#0B1D2A] pt-[60px] pb-16">
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(8,145,178,0.12)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[720px] mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 mb-6 border border-[rgba(34,211,238,0.25)] rounded-full px-4 py-1.5 bg-[rgba(34,211,238,0.06)]">
          <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span className="text-sm text-[#3b82f6] font-medium">
            Early access — begränsat antal platser
          </span>
        </div>

        <h1
          className="font-[900] text-white mb-4 sm:mb-4 leading-[1.08]"
          style={{ fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-2px" }}
        >
          <span className="sm:hidden">
            AI bokför{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent">
              åt dig
            </span>
          </span>
          <span className="hidden sm:inline">
            Bokföring som{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent">
              redan är gjord
            </span>
          </span>
        </h1>

        {/* Mobile-only: simple subtext */}
        <p className="sm:hidden text-[16px] text-white/60 mb-8 leading-relaxed max-w-[420px] mx-auto">
          Du gör inget — AI gör resten
        </p>

        {/* Desktop-only: rich copy */}
        <p className="hidden sm:block text-[17px] text-white/70 mb-3 leading-relaxed max-w-[600px] mx-auto">
          Ledger.io analyserar, bokför, stämmer av och förbereder deklarationer automatiskt. Du driver bolaget — AI gör jobbet.
        </p>

        <p className="hidden sm:block text-[16px] text-white/80 mb-3 max-w-[560px] mx-auto leading-relaxed">
          Spara <span className="text-[#3b82f6] font-semibold tabular-nums">10–20 timmar</span> per månad — utan manuellt arbete
        </p>

        <p className="hidden sm:block text-[15px] text-white/40 italic mb-6 max-w-[560px] mx-auto leading-relaxed">
          Vakna upp till färdig bokföring, korrekta siffror och full kontroll.
        </p>

        <div className="hidden sm:flex flex-wrap justify-center gap-2 mb-8">
          {valueBadges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-white/60 bg-white/[0.03] border border-white/[0.08]"
            >
              <Check className="w-3 h-3 text-[#3b82f6]" />
              {badge}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 max-w-[420px] mx-auto mb-4">
          <div className="hidden sm:grid grid-cols-2 gap-3">
            <Input
              type="text"
              placeholder="Namn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 focus:border-[rgba(34,211,238,0.5)] focus-visible:ring-0 rounded-lg"
            />
            <Input
              type="text"
              placeholder="Företag"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="h-11 bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 focus:border-[rgba(34,211,238,0.5)] focus-visible:ring-0 rounded-lg"
            />
          </div>
          <Input
            type="email"
            required
            placeholder="din@email.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-13 sm:h-11 bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 focus:border-[rgba(34,211,238,0.5)] focus-visible:ring-0 rounded-lg"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-13 sm:h-12 text-[15px] font-semibold bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] text-white hover:brightness-110 rounded-lg shadow-[0_4px_24px_rgba(6,182,212,0.4)] transition-all duration-200 hover:scale-[1.02]"
          >
            <span>{loading ? "Skickar..." : "Sätt igång — AI börjar direkt"}</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>

        <div className="hidden sm:flex items-center justify-center gap-3 max-w-[420px] mx-auto mb-6">
          <Button
            variant="glass"
            className="flex-1 h-11 rounded-lg text-[14px]"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          >
            Se hur det fungerar
          </Button>
        </div>

        <div className="hidden sm:flex items-center justify-center gap-1 mb-1 flex-wrap">
          <span className="text-[12px] text-white/35">Byggt för svenska företag •</span>
          {trustItems.map((item) => (
            <span key={item} className="flex items-center gap-1 text-[12px] text-white/40">
              <Check className="w-3 h-3 text-emerald-400" />
              {item}
            </span>
          ))}
        </div>

        {/* AI Demo Card — desktop only */}
        <div className="hidden sm:block relative max-w-[520px] mx-auto mt-6">
          <div className="absolute -inset-3 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)] blur-xl pointer-events-none" />
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <span className="text-[11px] text-white/30 ml-2 font-medium">Ledger.io</span>
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="p-5 space-y-3 min-h-[200px]">
              {/* User typing */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/30 font-medium w-8">Du:</span>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 flex-1">
                  <p className="text-[13px] text-white/80 font-mono">
                    {TYPING_TEXT.slice(0, typedChars)}
                    {demoPhase === "typing" && (
                      <span className="inline-block w-[2px] h-[14px] bg-[#3b82f6] ml-0.5 align-middle animate-pulse" />
                    )}
                  </p>
                </div>
              </div>

              {/* Processing indicators */}
              {(demoPhase === "processing" || demoPhase === "responding" || demoPhase === "done") && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-[#3b82f6] font-medium w-8 mt-1">AI:</span>
                  <div className="flex-1 space-y-1.5">
                    {processingSteps.map((step, i) => (
                      <div
                        key={step.text}
                        className={`flex items-center gap-2 transition-all duration-300 ${
                          i < visibleProcessing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                        }`}
                      >
                        {demoPhase === "processing" && i === visibleProcessing - 1 ? (
                          <Loader2 className="w-3.5 h-3.5 text-[#3b82f6] flex-shrink-0 animate-spin" />
                        ) : (
                          <span className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span className="text-[12px] text-white/40 italic">{step.text}</span>
                      </div>
                    ))}

                    {/* Result steps */}
                    {(demoPhase === "responding" || demoPhase === "done") && resultSteps.map((step, i) => (
                      <div
                        key={step.text}
                        className={`flex items-center gap-2 transition-all duration-300 ${
                          i < visibleResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="text-[13px] text-white/70">{step.text}</span>
                      </div>
                    ))}

                    {showFinal && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                        <p className="text-[13px] font-medium text-[#3b82f6]">
                          Klart. Tog 2 sekunder. Du behöver inte göra något.
                        </p>
                        <p className="text-[11px] text-white/50">
                          Upptäckte tidigare felklassificering → korrigerad
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Countdown — desktop only */}
        <div className="hidden sm:flex justify-center gap-2.5 mt-10">
          {countdownBoxes.map((box, i) => (
            <div key={box.label} className="flex items-center gap-2.5">
              <div className="w-[54px] h-[54px] rounded-xl bg-white/[0.05] border border-white/10 flex flex-col items-center justify-center">
                <span className="text-lg font-semibold text-white tabular-nums leading-none">
                  {String(box.value).padStart(2, "0")}
                </span>
                <span className="text-[8px] text-white/40 mt-1 uppercase tracking-wider">{box.label}</span>
              </div>
              {i < countdownBoxes.length - 1 && (
                <span className="text-white/20 text-sm font-bold">:</span>
              )}
            </div>
          ))}
        </div>

        <p className="hidden sm:block text-xs text-white/30 mt-4">
          Starta på 2 minuter · Ingen bindning · Ingen kreditkort krävs
        </p>
      </div>
    </section>
  );
};
