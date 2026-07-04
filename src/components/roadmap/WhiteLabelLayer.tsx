import { Users, Palette, Workflow, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Users,
    title: "Multi-client management",
    desc: "Hantera hundratals klienter från ett gränssnitt med isolerad data per bolag.",
  },
  {
    icon: Palette,
    title: "White label branding",
    desc: "Egen logotyp, färger och domän. Hela plattformen under ditt varumärke.",
  },
  {
    icon: Workflow,
    title: "Automatiserade arbetsflöden",
    desc: "Inleverans, kontering, moms och bokslut körs autonomt i bakgrunden.",
  },
  {
    icon: ShieldCheck,
    title: "AI-driven kvalitetskontroll",
    desc: "Avvikelser flaggas innan de når byråns granskare — färre fel, snabbare leverans.",
  },
];

export const WhiteLabelLayer = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#101a3a] to-[#0F172A] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.18)] md:p-14">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#3b82f6]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#EFF6FF] blur-3xl" />

      <div className="relative">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3b82f6]">
            White Label
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Lansera din egen bokföringsplattform.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/65">
            Cogniq kan köras under ditt varumärke — med full kontroll över klienter,
            arbetsflöden och data. Byggd för redovisningsbyråer, banker och rådgivare.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-[160ms] hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.06]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.06] text-[#3b82f6] ring-1 ring-white/[0.08]">
                <f.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </div>
              <h3 className="mt-4 text-sm font-semibold tracking-tight text-white">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={() => navigate("/white-label")}
            className="h-11 rounded-lg bg-white px-6 font-medium text-[#0F172A] shadow-sm transition-all hover:-translate-y-px hover:bg-white/95 hover:shadow-md"
          >
            Starta White Label
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate("/wl/beta/login")}
            variant="ghost"
            className="h-11 rounded-lg border border-white/25 bg-transparent px-6 font-medium text-white/90 hover:border-white/40 hover:bg-white/[0.06] hover:text-white"
          >
            Logga in som partner
          </Button>
        </div>
      </div>
    </section>
  );
};
