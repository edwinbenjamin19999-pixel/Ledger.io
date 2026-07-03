import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleRenderer } from "@/components/blog/ArticleRenderer";
import { RelatedArticles } from "@/components/blog/RelatedArticles";
import { getArticle, getRelated, ARTICLES } from "@/data/blog/articles";
import { getCategory } from "@/data/blog/categories";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Clock, Calendar, ChevronRight } from "lucide-react";

export default function BlogArticlePage() {
  const { slug = "" } = useParams();
  const article = getArticle(slug);

  useEffect(() => {
    if (article) document.title = `${article.title} — NorthLedger Blogg`;
  }, [article]);

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header lightBg />
        <main className="flex-1 flex items-center justify-center px-6 py-32">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-[#0f1f35]">Artikeln hittades inte</h1>
            <p className="mt-2 text-[#64748b]">Kanske flyttad eller borttagen.</p>
            <Button asChild className="mt-6 bg-white text-[#050d1a] hover:bg-white/90 font-semibold">
              <Link to="/blog">Tillbaka till bloggen</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const cat = getCategory(article.category);
  const related = getRelated(slug, 3);
  const fallbackRelated = related.length === 0
    ? ARTICLES.filter((a) => a.status === "published" && a.slug !== slug).slice(0, 3)
    : related;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header lightBg />
      <main className="flex-1">
        {/* Header */}
        <section className="pt-28 pb-10 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto max-w-3xl px-6">
            <nav className="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-6">
              <Link to="/" className="hover:text-[#3b82f6]">Hem</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/blog" className="hover:text-[#3b82f6]">Blogg</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#0f1f35]">{article.title}</span>
            </nav>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${cat.tint} ${cat.text}`}>{cat.label}</span>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-[#0f1f35] leading-[1.15]">
              {article.title}
            </h1>
            <p className="mt-5 text-xl text-[#475569] leading-relaxed">{article.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#94a3b8]">
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(article.publishedAt).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" })}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{article.readingTime} min läsning</span>
              <span>Av {article.author}</span>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="py-12">
          <article className="container mx-auto max-w-3xl px-6">
            {article.status === "published" && article.content ? (
              <ArticleRenderer blocks={article.content} />
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-10 text-center">
                <h2 className="text-2xl font-bold text-[#0f1f35]">Vi finputsar denna artikel</h2>
                <p className="mt-3 text-[#64748b] max-w-md mx-auto">
                  Den här artikeln är på väg att publiceras. Under tiden — utforska våra andra insikter nedan.
                </p>
              </div>
            )}

            {/* Final inline CTA */}
            <div className="mt-12 rounded-2xl bg-[#0f1f35] p-8 md:p-10 text-white">
              <div className="text-xs uppercase tracking-[0.2em] text-[#3b82f6]">Redo att testa?</div>
              <h3 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">Låt AI sköta din bokföring</h3>
              <p className="mt-2 text-white/60 max-w-lg">Onboarding på 30 minuter. Ingen bindning. Bygg en framtidssäker ekonomi.</p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Button asChild className="bg-white text-[#050d1a] hover:bg-white/90 font-semibold">
                  <Link to="/auth">Testa NorthLedger <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/contact">Boka demo</Link>
                </Button>
              </div>
            </div>

            <div className="mt-10">
              <Button asChild variant="ghost" className="text-[#64748b]">
                <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-1.5" />Alla artiklar</Link>
              </Button>
            </div>
          </article>
        </section>

        <RelatedArticles articles={fallbackRelated} />
      </main>
      <Footer />
    </div>
  );
}
