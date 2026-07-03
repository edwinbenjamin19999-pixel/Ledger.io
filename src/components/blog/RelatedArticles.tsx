import type { Article } from "@/data/blog/types";
import { CompactArticleCard } from "./CompactArticleCard";

export const RelatedArticles = ({ articles }: { articles: Article[] }) => {
  if (articles.length === 0) return null;
  return (
    <section className="py-12 border-t border-slate-100">
      <div className="container mx-auto max-w-3xl px-6">
        <h2 className="text-xl font-bold text-[#0f1f35] tracking-tight mb-2">Relaterade artiklar</h2>
        <div className="divide-y divide-slate-100">
          {articles.map((a) => <CompactArticleCard key={a.slug} article={a} />)}
        </div>
      </div>
    </section>
  );
};
