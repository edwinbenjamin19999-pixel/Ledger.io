import { Link } from "react-router-dom";
import type { Article } from "@/data/blog/types";
import { getCategory } from "@/data/blog/categories";

export const CompactArticleCard = ({ article }: { article: Article }) => {
  const cat = getCategory(article.category);
  return (
    <Link to={`/blog/${article.slug}`} className="group block py-4 border-b border-slate-100 last:border-0">
      <div className={`text-[10px] uppercase tracking-wider font-medium ${cat.text}`}>{cat.label}</div>
      <div className="mt-1 text-sm font-semibold text-[#0f1f35] group-hover:text-[#3b82f6] transition-colors leading-snug">
        {article.title}
      </div>
      <div className="mt-1 text-xs text-[#94a3b8]">{article.readingTime} min läsning</div>
    </Link>
  );
};
