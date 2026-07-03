import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import type { Article } from "@/data/blog/types";
import { getCategory } from "@/data/blog/categories";

export const FeaturedArticleCard = ({ article }: { article: Article }) => {
  const cat = getCategory(article.category);
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group block rounded-3xl border border-slate-100 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)] transition-all duration-200 overflow-hidden"
    >
      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative h-64 md:h-full bg-gradient-to-br from-[#0f1f35] via-[#3b82f6] to-[#3b82f6] flex items-center justify-center p-10">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.6), transparent 60%)" }} />
          <div className="relative text-white/95 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-[#3b82f6] mb-3">Featured</div>
            <div className="text-3xl md:text-4xl font-bold leading-tight tracking-tight max-w-xs mx-auto">{article.title}</div>
          </div>
        </div>
        <div className="p-8 md:p-10 flex flex-col">
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${cat.tint} ${cat.text}`}>{cat.label}</span>
          <h2 className="mt-4 text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight leading-tight group-hover:text-[#3b82f6] transition-colors">
            {article.title}
          </h2>
          <p className="mt-3 text-[#475569] leading-relaxed">{article.excerpt}</p>
          <div className="mt-auto pt-6 flex items-center justify-between text-sm text-[#94a3b8]">
            <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{article.readingTime} min läsning</span>
            <span className="inline-flex items-center gap-1.5 text-[#3b82f6] font-medium group-hover:gap-2.5 transition-all">
              Läs artikel <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
