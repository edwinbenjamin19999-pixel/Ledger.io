import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LAUNCH_DATE = new Date("2026-05-11T09:00:00+02:00");

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

export const PreLaunchHero = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const countdown = useCountdown(LAUNCH_DATE);

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
      if (error.code === "23505") {
        toast.info("Du är redan registrerad!");
      } else {
        toast.error("Något gick fel. Försök igen.");
      }
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
      { value: countdown.minutes, label: "Minuter" },
      { value: countdown.seconds, label: "Sekunder" },
    ],
    [countdown]
  );

  const highlights = [
    "BAS 2026-kontoplan",
    "Automatisk momsdeklaration",
    "BankID-signering",
    "Bankintegration",
  ];

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-[#0F172A] pt-[60px]">
      {/* Subtle line pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.15) 59px, rgba(255,255,255,0.15) 60px)",
        }}
      />

      {/* Radial glow blobs */}
      <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,82,255,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,82,255,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-24">
        <div className="max-w-[760px] mx-auto text-center">
          {/* Launch pill */}
          <div className="inline-flex items-center gap-2.5 mb-8 border border-[rgba(0,82,255,0.25)] rounded-full px-5 py-2 bg-[rgba(0,82,255,0.06)]">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
            <span className="text-sm text-[#3b82f6] font-medium">
              Lansering om {countdown.days} dagar — Early access öppen
            </span>
          </div>

          {/* H1 */}
          <h1
            className="font-[900] text-white mb-5 leading-[1.08]"
            style={{
              fontSize: "clamp(38px, 5.5vw, 68px)",
              letterSpacing: "-2.5px",
            }}
          >
            Bokföring för företag som vill{" "}
            <span className="text-[#3b82f6]">framåt</span>
          </h1>

          {/* Paragraph */}
          <p className="text-[17px] text-[rgba(255,255,255,0.55)] mb-8 max-w-[480px] mx-auto leading-relaxed">
            Cogniq automatiserar din bokföring, momsdeklaration och
            årsredovisning. Du fokuserar på verksamheten.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {highlights.map((h) => (
              <div
                key={h}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.65)] text-[12.5px]"
              >
                <Check className="w-3.5 h-3.5 text-[#3b82f6]" />
                {h}
              </div>
            ))}
          </div>

          {/* Signup form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3 max-w-[420px] mx-auto mb-6"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder="Namn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.12)] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:border-[rgba(0,82,255,0.5)] focus-visible:ring-0 rounded-lg"
              />
              <Input
                type="text"
                placeholder="Företag"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-11 bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.12)] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:border-[rgba(0,82,255,0.5)] focus-visible:ring-0 rounded-lg"
              />
            </div>
            <Input
              type="email"
              required
              placeholder="din@email.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.12)] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:border-[rgba(0,82,255,0.5)] focus-visible:ring-0 rounded-lg"
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-[15px] font-semibold bg-[#3b82f6] text-white hover:bg-[#3b82f6] rounded-lg shadow-[0_4px_20px_rgba(0,82,255,0.4)]"
            >
              {loading ? "Skickar..." : "Säkra din plats"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Micro text */}
          <p className="text-xs text-[rgba(255,255,255,0.35)] mb-10">
            14 dagars gratis · Ingen bindningstid · GDPR-säkert
          </p>

          {/* Countdown */}
          <div className="flex justify-center gap-3 max-w-sm mx-auto">
            {countdownBoxes.map((box, i) => (
              <div key={box.label} className="flex items-center gap-3">
                <div className="w-[68px] h-[68px] rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-semibold text-white tabular-nums leading-none">
                    {String(box.value).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] text-[rgba(255,255,255,0.4)] mt-1 uppercase tracking-wider">
                    {box.label}
                  </span>
                </div>
                {i < countdownBoxes.length - 1 && (
                  <span className="text-[rgba(255,255,255,0.2)] text-lg font-bold">:</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
