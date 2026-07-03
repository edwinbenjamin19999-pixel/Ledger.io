import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ARTICLES_BY_SLUG } from "@/data/guides/articles";
import type { Intent } from "@/data/guides/articles/types";

const intentLabel: Record<Intent, string> = {
  beginner: "Nybörjare",
  transactional: "Praktisk guide",
  compliance: "Regelverk",
  business: "Analys",
};

export const RelatedGuides = ({ slugs }: { slugs: string[] }) => {
  const items = slugs.map((s) => ARTICLES_BY_SLUG[s]).filter(Boolean);
  if (!items.length) return null;
  return (
    <section className="not-prose my-14">
      <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#3b82f6]">
        Fortsätt läsa
      </div>
      <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-[#0f1f35]">
        Relaterade guider
      </h2>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {items.map((g) => (
          <Link
            key={g.slug}
            to={`/resources/accounting-guides/${g.slug}`}
            className="group flex flex-col rounded-[20px] border border-slate-900/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(15,23,42,0.15)] transition-all duration-300"
          >
            <div className="inline-flex self-start items-center rounded-full border border-slate-900/[0.08] bg-slate-50 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-600">
              {intentLabel[g.intent]}
            </div>
            <div className="mt-4 text-[17px] font-semibold text-[#0f1f35] tracking-tight leading-snug line-clamp-2">
              {g.h1.split("—")[0].split("?")[0].trim()}
            </div>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed line-clamp-2 flex-1">
              {g.excerpt}
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3b82f6]">
              Läs guiden
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
