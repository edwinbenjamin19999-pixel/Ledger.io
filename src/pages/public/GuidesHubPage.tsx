import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GuideCategoryCard } from "@/components/guides/GuideCategoryCard";
import { GuideCard } from "@/components/guides/GuideCard";
import { BeginnerPath } from "@/components/guides/BeginnerPath";
import { Button } from "@/components/ui/button";
import { GUIDE_CATEGORIES } from "@/data/guides/categories";
import { GUIDES } from "@/data/guides/guides";
import { ArrowRight, BookOpen } from "lucide-react";

export default function GuidesHubPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header lightBg />
      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-12 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/60 bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#3b82f6]">
              <BookOpen className="w-3 h-3" />
              Bokföringsguider
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-[#0f1f35]">
              Allt du behöver veta om bokföring
            </h1>
            <p className="mt-5 text-lg text-[#475569] leading-relaxed">
              Från första kvittot till färdig årsredovisning — strukturerade guider på svenska, anpassade för SME-företag och redovisningsbyråer.
            </p>
          </div>
        </section>

        {/* Categories */}
        <section className="py-12">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {GUIDE_CATEGORIES.map((c) => (
                <GuideCategoryCard key={c.id} {...c} count={GUIDES.filter((g) => g.category === c.id).length} />
              ))}
            </div>
          </div>
        </section>

        {/* Guides per category */}
        <section className="py-12">
          <div className="container mx-auto max-w-5xl px-6 space-y-14">
            {GUIDE_CATEGORIES.map((cat) => {
              const items = GUIDES.filter((g) => g.category === cat.id);
              if (!items.length) return null;
              return (
                <div key={cat.id} id={cat.id} className="scroll-mt-24">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-2xl font-bold text-[#0f1f35] tracking-tight">{cat.label}</h2>
                      <p className="text-sm text-[#64748b] mt-1">{cat.description}</p>
                    </div>
                    <span className="text-xs text-[#94a3b8]">{items.length} guider</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {items.map((g) => <GuideCard key={g.id} guide={g} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <BeginnerPath />

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold text-[#0f1f35]">Slipp läsa — låt AI göra jobbet</h2>
            <p className="mt-3 text-[#64748b]">NorthLedger tillämpar reglerna automatiskt så att du kan fokusera på företaget.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-white text-[#050d1a] hover:bg-white/90 font-semibold">
                <Link to="/auth">Testa NorthLedger <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contact">Boka demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <div className="bg-[#0a1525]">
        <Footer />
      </div>
    </div>
  );
}
