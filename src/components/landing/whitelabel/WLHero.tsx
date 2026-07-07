import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const WLHero = () => {
  const navigate = useNavigate();
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#F5F8FF] pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#0052FF]/[0.08] blur-[120px]" />
        <div className="absolute top-2/3 left-[20%] w-[500px] h-[500px] rounded-full bg-[#0052FF]/[0.05] blur-[100px]" />
      </div>

      <div className="relative container mx-auto max-w-5xl px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#0052FF]/20 bg-[#0052FF]/[0.06] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] animate-pulse" />
          <span className="text-[#0052FF] text-[11px] font-medium tracking-wider uppercase">
            Återkommande intäkter · Egen domän · AI-driven
          </span>
        </div>
        <h1
          className="text-4xl md:text-6xl font-[700] text-[#0F172A] leading-[1.05] max-w-4xl mx-auto"
          style={{ letterSpacing: "-1px" }}
        >
          Starta din egen bokföringsplattform
          <span className="text-[#0052FF]"> — utan att bygga den.</span>
        </h1>
        <p className="mt-7 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Erbjud en AI-driven ekonomiplattform under ditt varumärke. Vi hanterar tekniken — du äger kunden.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/white-label/onboarding")}
            className="h-12 px-7 bg-[#0052FF] hover:bg-[#0040CC] text-white font-semibold rounded-lg group shadow-[0_2px_24px_rgba(0,82,255,0.25)]"
          >
            Lansera min plattform
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => scrollTo("how-it-works")}
            className="h-12 px-7 rounded-lg"
          >
            Se hur det fungerar
          </Button>
        </div>

        {/* Micro-proof */}
        <div className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-slate-400 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#0052FF]" />
            Live på dagar
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#0052FF]" />
            0 utvecklingskostnad
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[#0052FF]" />
            Du äger kunden
          </div>
        </div>
      </div>
    </section>
  );
};
