import { Clock, Calendar } from "lucide-react";
import type { Intent } from "@/data/guides/articles/types";

const intentLabel: Record<Intent, string> = {
  beginner: "Nybörjare",
  transactional: "Praktisk guide",
  compliance: "Regelverk",
  business: "Analys",
};

interface ArticleHeroProps {
  h1: string;
  intro: string[];
  intent: Intent;
  readingTime: number;
  updatedAt: string;
}

export const ArticleHero = ({ h1, intro, intent, readingTime, updatedAt }: ArticleHeroProps) => {
  const [subtitle, ...rest] = intro;
  return (
    <header className="relative border-b border-slate-900/[0.06] bg-[radial-gradient(ellipse_at_top,_#F0F9FF_0%,_#FAFBFC_60%)] pt-32 pb-16">
      <div className="container mx-auto max-w-[760px] px-6 text-center">
        <div className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <span className="inline-flex items-center rounded-full border border-slate-900/[0.08] bg-white/70 px-3 py-1 font-semibold text-[#3b82f6] backdrop-blur">
            {intentLabel[intent]}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Clock className="w-3 h-3" /> {readingTime} min
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-medium">
            <Calendar className="w-3 h-3" /> {new Date(updatedAt).toLocaleDateString("sv-SE")}
          </span>
        </div>
        <h1 className="mt-6 text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-[#0f1f35] leading-[1.1]">
          {h1}
        </h1>
        {subtitle && (
          <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        )}
        {rest.length > 0 && (
          <div className="mt-5 max-w-2xl mx-auto space-y-3 text-[17px] text-slate-600 leading-[1.75]">
            {rest.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
      </div>
    </header>
  );
};
