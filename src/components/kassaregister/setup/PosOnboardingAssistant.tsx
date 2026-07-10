import { Bot, Zap, Sliders, ShieldCheck } from "lucide-react";

const COPY: Record<string, { auto: string; control: string; verify: string }> = {
  provider: {
    auto: "Vi identifierar automatiskt vilket kassasystem du använder.",
    control: "Du väljer system och anslutningstyp (API, CSV eller manuell).",
    verify: "AI kontrollerar att integrationen är säker och stabil.",
  },
  mapping: {
    auto: "AI mappar momssatser till BAS-konton enligt 2025-standarden.",
    control: "Du kan justera enskilda kontomappningar manuellt.",
    verify: "AI validerar att alla momssatser täcks korrekt.",
  },
  bank: {
    auto: "Z-rapporter matchas automatiskt mot bankinsättningar.",
    control: "Du beslutar hur differenser ska hanteras.",
    verify: "AI flaggar avvikelser och föreslår justeringar.",
  },
  confidence: {
    auto: "Z-rapporter med hög konfidens bokförs automatiskt.",
    control: "Du sätter tröskeln och kan alltid kräva godkännande.",
    verify: "AI beräknar konfidens per rapport och loggar allt spårbart.",
  },
};

export function PosOnboardingAssistant({ step }: { step: keyof typeof COPY }) {
  const c = COPY[step];

  return (
    <aside className="lg:sticky lg:top-6 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-[#0052FF] flex items-center justify-center text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">AI-assistent</p>
          <p className="text-xs text-slate-500">Jag sätter upp det här åt dig 👋</p>
        </div>
      </div>

      <div className="space-y-4">
        <Section icon={Zap} color="cyan" title="Vad sker automatiskt" text={c.auto} />
        <Section icon={Sliders} color="slate" title="Vad du styr" text={c.control} />
        <Section icon={ShieldCheck} color="emerald" title="Vad AI kontrollerar" text={c.verify} />
      </div>
    </aside>
  );
}

function Section({ icon: Icon, color, title, text }: { icon: any; color: string; title: string; text: string }) {
  const colorMap: Record<string, string> = {
    cyan: "text-[#0052FF] bg-[#EFF6FF]",
    slate: "text-slate-700 bg-slate-100",
    emerald: "text-[#085041] bg-[#E1F5EE]",
  };
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md ${colorMap[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed pl-8">{text}</p>
    </div>
  );
}
