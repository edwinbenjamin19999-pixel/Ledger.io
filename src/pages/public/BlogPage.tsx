import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogHero } from "@/components/blog/BlogHero";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { FeaturedArticleCard } from "@/components/blog/FeaturedArticleCard";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { CompactArticleCard } from "@/components/blog/CompactArticleCard";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { ARTICLES, getFeatured, getPopular } from "@/data/blog/articles";
import type { CategoryId } from "@/data/blog/types";

export default function BlogPage() {
  const [active, setActive] = useState<CategoryId | "all">("all");
  const featured = getFeatured();
  const popular = getPopular(3);

  const filtered = useMemo(() => {
    const rest = ARTICLES.filter((a) => a.slug !== featured.slug);
    if (active === "all") return rest;
    return rest.filter((a) => a.category === active);
  }, [active, featured.slug]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header lightBg />
      <main className="flex-1">
        <BlogHero
          eyebrow="Bokfy Insikter"
          title="Insikter inom AI, bokföring och tillväxt"
          subtitle="Artiklar, guider och perspektiv om hur AI förändrar bokföring, moms, rapportering och ekonomistyrning för svenska företag."
        />

        <CategoryFilter active={active} onChange={setActive} />

        {/* Featured */}
        {active === "all" && (
          <section className="py-12">
            <div className="container mx-auto max-w-6xl px-6">
              <FeaturedArticleCard article={featured} />
            </div>
          </section>
        )}

        {/* Grid */}
        <section className="py-8">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-[#94a3b8] py-12">Inga artiklar i denna kategori ännu.</p>
            )}
          </div>
        </section>

        {/* Popular */}
        <section className="py-16 bg-slate-50/60 border-y border-slate-100">
          <div className="container mx-auto max-w-3xl px-6">
            <h2 className="text-xl font-bold text-[#0F1B2D] tracking-tight mb-1">Populära artiklar</h2>
            <p className="text-sm text-[#64748b] mb-4">Det våra läsare återvänder till oftast.</p>
            <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 px-6 shadow-sm">
              {popular.map((a) => <CompactArticleCard key={a.slug} article={a} />)}
            </div>
          </div>
        </section>

        <NewsletterCTA />
      </main>
      <Footer />
    </div>
  );
}
