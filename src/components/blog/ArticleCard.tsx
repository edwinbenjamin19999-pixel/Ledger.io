import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import type { Article } from "@/data/blog/types";
import { getCategory } from "@/data/blog/categories";

export const ArticleCard = ({ article }: { article: Article }) => {
  const cat = getCategory(article.category);
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group flex flex-col h-full rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200 p-6"
    >
      <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${cat.tint} ${cat.text}`}>
        {cat.label}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-[#0F172A] tracking-tight leading-snug group-hover:text-[#3b82f6] transition-colors">
        {article.title}
      </h3>
      <p className="mt-2 text-sm text-[#64748b] leading-relaxed line-clamp-2">{article.excerpt}</p>
      <div className="mt-auto pt-5 flex items-center justify-between text-xs text-[#94a3b8]">
        <span className="inline-flex items-center gap-1.5"><Clock className="w-3 h-3" />{article.readingTime} min</span>
        <ArrowRight className="w-4 h-4 text-[#3b82f6] group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
};
