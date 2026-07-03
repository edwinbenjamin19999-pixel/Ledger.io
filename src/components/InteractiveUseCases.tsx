import { useState, useCallback, useEffect, useRef } from "react";
import {
  FileText,
  Landmark,
  TrendingUp,
  
  Send,
  Check,
  AlertTriangle,
  Play,
  ChevronDown,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface UseCase {
  id: string;
  icon: React.ElementType;
  title: string;
  situation: string;
  aiAction: string;
  result: string;
  description: string;
  demoSteps: { text: string; type: "success" | "warning" }[];
  status?: string;
  cta: string;
  aiTime: string;
  manualTime: string;
  featured?: boolean;
}

const useCases: UseCase[] = [
  {
    id: "moms",
    icon: FileText,
    title: "Slipp momsdeklaration helt",
    situation: "Det är dags att deklarera moms",
    aiAction: "Analyserar verifikationer, beräknar moms, förbereder AGI",
    result: "Klar deklaration · redo att signera · 3 sek",
    description: "AI sammanställer hela momsperioden och förbereder inlämning till Skatteverket.",
    demoSteps: [
      { text: "25 verifikationer analyserade", type: "success" },
      { text: "Moms beräknad", type: "success" },
      { text: "AGI redo", type: "success" },
    ],
    status: "Redo att skickas till Skatteverket",
    cta: "Skicka nu",
    aiTime: "3 sekunder",
    manualTime: "1–2 timmar",
    featured: true,
  },
  {
    id: "autobook",
    icon: FileText,
    title: "Slipp bokföra hyra & löpande utgifter",
    situation: "Du betalade hyra 8 500 kr",
    aiAction: "Identifierar konto, kontrollerar moms, bokför, matchar bank",
    result: "Konto 5010 · Moms ej tillämplig · Klart på 2 sek",
    description: "AI kategoriserar och bokför direkt utan manuellt arbete.",
    demoSteps: [
      { text: "Konto identifierat: 5010 Hyra", type: "success" },
      { text: "Bokförd och matchad", type: "success" },
    ],
    cta: "Se bokföring",
    aiTime: "2 sekunder",
    manualTime: "5 min",
  },
  {
    id: "bank",
    icon: Landmark,
    title: "Slipp avstämma bank manuellt",
    situation: "20 nya banktransaktioner kom in",
    aiAction: "Matchar mot fakturor, identifierar OCR, flaggar avvikelser",
    result: "18 matchade · 2 flaggade för granskning · 3 sek",
    description: "AI matchar banktransaktioner mot underlag automatiskt.",
    demoSteps: [
      { text: "18/20 transaktioner matchade", type: "success" },
      { text: "2 kräver granskning", type: "warning" },
    ],
    cta: "Granska nu",
    aiTime: "3 sekunder",
    manualTime: "45 min",
  },
  {
    id: "insights",
    icon: TrendingUp,
    title: "Slipp gissa hur bolaget mår",
    situation: "Du vill veta hur bolaget mår",
    aiAction: "Analyserar trender, jämför perioder, identifierar besparingar",
    result: "Färdig analys · konkreta åtgärder · 3 sek",
    description: "AI ger dig en realtidsbild av lönsamhet, kassa och skatteläge.",
    demoSteps: [
      { text: "Trendanalys klar", type: "success" },
      { text: "Marginalavvikelse upptäckt", type: "warning" },
    ],
    cta: "Se analys",
    aiTime: "3 sekunder",
    manualTime: "1 timme",
  },
  {
    id: "invoicing",
    icon: Send,
    title: "Slipp jaga betalningar",
    situation: "En faktura passerade förfallodag",
    aiAction: "Skickar påminnelse, eskalerar, föreslår inkasso",
    result: "Påminnelse skickad · uppföljning schemalagd · 2 sek",
    description: "AI driver in obetalda fakturor utan att du behöver hålla koll.",
    demoSteps: [
      { text: "Påminnelse skickad", type: "success" },
      { text: "Eskalering schemalagd", type: "warning" },
    ],
    cta: "Skicka påminnelse",
    aiTime: "2 sekunder",
    manualTime: "20 min",
  },
];

const DemoSimulation = ({ useCase }: { useCase: UseCase }) => {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setVisibleSteps(0);
    useCase.demoSteps.forEach((_, i) => {
      setTimeout(() => {
        if (mounted.current) setVisibleSteps(i + 1);
      }, 400 + i * 500);
    });
    return () => { mounted.current = false; };
  }, [useCase.id]);

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
      {useCase.demoSteps.map((step, i) => (
        <div
          key={step.text}
          className={`flex items-center gap-2 transition-all duration-300 ${
            i < visibleSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {step.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span className="text-[13px] text-white/70">{step.text}</span>
        </div>
      ))}

      {useCase.status && visibleSteps >= useCase.demoSteps.length && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-[rgba(8,145,178,0.1)] border border-[rgba(34,211,238,0.15)]">
          <span className="text-[13px] font-medium text-[#3b82f6]">{useCase.status}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <Button
          size="sm"
          className="h-8 text-[12px] font-semibold bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] text-white hover:brightness-110 rounded-md"
        >
          {useCase.cta}
        </Button>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-emerald-400/80 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            AI gjorde detta på {useCase.aiTime}
          </span>
          <span className="text-white/30">—</span>
          <span className="flex items-center gap-1 text-white/30">
            <Clock className="w-3 h-3" />
            manuellt: {useCase.manualTime}
          </span>
        </div>
      </div>
    </div>
  );
};

export const InteractiveUseCases = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = (id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
    setAutoPlaying(false);
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
  };

  const autoPlay = useCallback(() => {
    setAutoPlaying(true);
    let i = 0;
    const next = () => {
      if (i >= useCases.length) {
        setAutoPlaying(false);
        setActiveId(null);
        return;
      }
      setActiveId(useCases[i].id);
      i++;
      autoPlayRef.current = setTimeout(next, 4000);
    };
    next();
  }, []);

  useEffect(() => {
    return () => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current); };
  }, []);

  const featured = useCases[0];
  const smallCards = useCases.slice(1);

  return (
    <section id="features" className="relative py-20 bg-[#0B1D2A]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2
            className="font-[800] text-white mb-4"
            style={{ fontSize: "clamp(26px, 4vw, 42px)", letterSpacing: "-1.5px" }}
          >
            Vad AI gör —{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent">
              varje dag
            </span>
          </h2>
          <p className="text-white/50 text-[15px] max-w-xl mx-auto mb-2">
            Problem → AI-handling → Resultat. Varje exempel är hämtat ur en typisk arbetsdag.
          </p>

          <Button
            variant="ghost"
            onClick={autoPlay}
            disabled={autoPlaying}
            className="text-[14px] text-[#3b82f6] hover:text-[#3b82f6] hover:bg-white/[0.06] gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            {autoPlaying ? "Kör demo..." : "Se hur Bokfy jobbar →"}
          </Button>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:block max-w-[900px] mx-auto space-y-3">
          <CardItem
            useCase={featured}
            isActive={activeId === featured.id}
            isDimmed={activeId !== null && activeId !== featured.id}
            onToggle={() => toggle(featured.id)}
            large
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {smallCards.map((uc) => (
              <CardItem
                key={uc.id}
                useCase={uc}
                isActive={activeId === uc.id}
                isDimmed={activeId !== null && activeId !== uc.id}
                onToggle={() => toggle(uc.id)}
              />
            ))}
          </div>
        </div>

        {/* Mobile: one-per-screen horizontal swipe */}
        <div className="sm:hidden -mx-4">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-4 scrollbar-hide">
            {useCases.map((uc) => (
              <div key={uc.id} className="snap-center flex-shrink-0 w-[85%] first:ml-0">
                <CardItem
                  useCase={uc}
                  isActive={activeId === uc.id}
                  isDimmed={false}
                  onToggle={() => toggle(uc.id)}
                />
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-white/30 mt-2">Svep för fler →</p>
        </div>
      </div>
    </section>
  );
};

function CardItem({
  useCase,
  isActive,
  isDimmed,
  onToggle,
  large,
}: {
  useCase: UseCase;
  isActive: boolean;
  isDimmed: boolean;
  onToggle: () => void;
  large?: boolean;
}) {
  const Icon = useCase.icon;

  return (
    <div
      onClick={onToggle}
      className={`group relative rounded-2xl border bg-white/[0.04] backdrop-blur-sm cursor-pointer transition-all duration-250 ease-out ${
        large ? "p-6" : "p-5"
      } ${
        isActive
          ? "border-[rgba(34,211,238,0.3)] shadow-[0_0_30px_rgba(6,182,212,0.15)]"
          : "border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]"
      } ${isDimmed ? "opacity-60 scale-[0.98]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${large ? "w-10 h-10" : "w-8 h-8"} rounded-xl bg-[rgba(8,145,178,0.15)] flex items-center justify-center`}>
            <Icon className={`${large ? "w-5 h-5" : "w-4 h-4"} text-[#3b82f6] transition-transform duration-200 group-hover:scale-110`} />
          </div>
          <div>
            <h3 className={`font-semibold text-white ${large ? "text-[17px]" : "text-[15px]"}`}>
              {useCase.title}
            </h3>
            {!isActive && (
              <p className="text-[12px] text-white/40 mt-0.5 line-clamp-1">{useCase.description}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/30 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`}
        />
      </div>

      {/* Situation → AI → Result triplet — AI line hidden on mobile when collapsed */}
      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2.5">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider w-[68px] flex-shrink-0 mt-0.5">Du</span>
          <span className="text-[13px] text-white/70 flex-1">{useCase.situation}</span>
        </div>
        <div className={`flex items-start gap-2.5 ${isActive ? "" : "hidden sm:flex"}`}>
          <span className="text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider w-[68px] flex-shrink-0 mt-0.5">AI</span>
          <span className="text-[13px] text-white/70 flex-1">{useCase.aiAction}</span>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider w-[68px] flex-shrink-0 mt-0.5">Resultat</span>
          <span className="text-[13px] text-white/85 font-medium flex-1">{useCase.result}</span>
        </div>
      </div>

      {isActive && (
        <div className="animate-fade-in">
          <DemoSimulation useCase={useCase} />
        </div>
      )}
    </div>
  );
}
