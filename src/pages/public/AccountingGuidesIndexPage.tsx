import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArticleSEO } from "@/components/guides/article/ArticleSEO";
import { ARTICLES } from "@/data/guides/articles";
import { COMPACT_GUIDES } from "@/data/guides/compact";
import type { Intent } from "@/data/guides/articles/types";
import { PremiumGuideCard } from "@/components/guides/PremiumGuideCard";
import { ArrowRight, BookOpen, Search, Building2, Sparkles } from "lucide-react";

const CLUSTERS: { id: Intent; label: string; description: string }[] = [
  { id: "beginner", label: "Nybörjare", description: "Grunderna i bokföring — börja här om du är ny." },
  { id: "transactional", label: "Praktiska guider", description: "Steg-för-steg-instruktioner för vanliga händelser." },
  { id: "compliance", label: "Regelverk & moms", description: "Svenska regler, moms och compliance." },
  { id: "business", label: "Analys & nyckeltal", description: "Förstå siffrorna och fatta bättre beslut." },
];

interface CardItem {
  slug: string;
  title: string;
  excerpt: string;
  readingTime: number;
  intent: Intent;
}

export default function AccountingGuidesIndexPage() {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const allCards: CardItem[] = useMemo(
    () => [
      ...ARTICLES.map((a) => ({
        slug: a.slug,
        title: a.h1.split("—")[0].split("?")[0].trim(),
        excerpt: a.excerpt,
        readingTime: a.readingTime,
        intent: a.intent,
      })),
      ...COMPACT_GUIDES.map((g) => ({
        slug: g.slug,
        title: g.h1.split("—")[0].split("?")[0].trim(),
        excerpt: g.excerpt,
        readingTime: g.readingTime,
        intent: g.intent,
      })),
    ],
    [],
  );

  const filtered = useMemo(() => {
    if (!q) return allCards;
    return allCards.filter(
      (c) => c.title.toLowerCase().includes(q) || c.excerpt.toLowerCase().includes(q),
    );
  }, [q, allCards]);

  const indexJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bokföringsguider",
    description: "Praktiska guider om bokföring, moms, BAS-kontoplan och svenska redovisningsregler.",
    url: "https://northledger.se/resources/accounting-guides",
    inLanguage: "sv-SE",
    hasPart: allCards.map((c) => ({
      "@type": "Article",
      headline: c.title,
      url: `https://northledger.se/resources/accounting-guides/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ArticleSEO
        title="Bokföringsguider — komplett guide-bibliotek på svenska | Ledger.io"
        description="13 praktiska guider om bokföring, moms, BAS-kontoplan och svenska redovisningsregler. Lär dig bokföra kvitton, fakturor, moms och analysera nyckeltal — steg för steg."
        canonicalPath="/resources/accounting-guides"
        jsonLd={[indexJsonLd]}
      />
      <Header lightBg />
      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-12 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/60 bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#3b82f6]">
              <BookOpen className="w-3 h-3" />
              Bokföringsguider · {allCards.length} guider
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-[#0f1f35]">
              Allt du behöver veta om bokföring
            </h1>
            <p className="mt-5 text-lg text-[#475569] leading-relaxed">
              Praktiska guider på svenska — anpassade för småföretagare och redovisningsbyråer.
            </p>
            <div className="relative mt-8 max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Sök t.ex. "kvitto", "moms", "kassaflöde"…'
                className="pl-10 h-11 border-slate-200 bg-white"
              />
            </div>
          </div>
        </section>

        {/* Clusters */}
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-6 space-y-16">
            {CLUSTERS.map((cluster) => {
              const items = filtered.filter((c) => c.intent === cluster.id);
              if (!items.length) return null;
              const totalMin = items.reduce((acc, i) => acc + i.readingTime, 0);
              return (
                <div key={cluster.id} id={cluster.id} className="scroll-mt-24">
                  <div className="mb-6 pb-4 border-b border-slate-100">
                    <h2 className="text-2xl md:text-[28px] font-bold text-[#0f1f35] tracking-tight">
                      {cluster.label}
                    </h2>
                    <p className="text-sm text-[#64748b] mt-1.5">{cluster.description}</p>
                    <div className="mt-2 text-xs text-[#94a3b8] font-medium">
                      {items.length} guider · ~{totalMin} min läsning
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {items.map((c) => (
                      <PremiumGuideCard
                        key={c.slug}
                        to={`/resources/accounting-guides/${c.slug}`}
                        title={c.title}
                        excerpt={c.excerpt}
                        readingTime={c.readingTime}
                      />
                    ))}
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs italic text-[#3b82f6]">
                    <Sparkles className="w-3 h-3" />
                    Alla dessa moment hanteras automatiskt av Ledger.io
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-[#94a3b8] py-8">Inga guider matchade din sökning.</div>
            )}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16">
          <div className="container mx-auto max-w-4xl px-6">
            <div className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-slate-50 border border-cyan-100/60 shadow-[0_8px_32px_-12px_rgba(8,145,178,0.18)] p-10 md:p-14 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3b82f6] text-white mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0f1f35]">
                Slipp manuell bokföring
              </h2>
              <p className="mt-4 text-lg text-[#475569] leading-relaxed max-w-xl mx-auto">
                Ledger.io bokför kvitton, fakturor och moms automatiskt med AI.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="bg-[#3b82f6] text-white hover:bg-[#3b82f6] gap-1.5">
                  <Link to="/auth">
                    Testa gratis <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-slate-300 text-[#0f1f35] hover:bg-slate-50"
                >
                  <Link to="/contact">Boka demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* White Label CTA for agencies */}
        <section className="pb-16">
          <div className="container mx-auto max-w-4xl px-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#0f1f35] to-[#0a1525] p-8 md:p-10 text-white">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#3b82f6]">
                <Building2 className="w-3.5 h-3.5" /> För redovisningsbyråer
              </div>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">
                Lansera din egen bokföringsplattform
              </h2>
              <p className="mt-3 text-white/70 leading-relaxed max-w-xl">
                Erbjud automatiserad bokföring under ditt eget varumärke. Multi-client management, white label branding och AI-driven kvalitetskontroll.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button asChild className="bg-[#3b82f6] text-white hover:bg-[#3b82f6] gap-1.5">
                  <Link to="/white-label">
                    Starta White Label <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/contact">Boka demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
