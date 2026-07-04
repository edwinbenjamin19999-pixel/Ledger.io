import { Link } from "react-router-dom";
import { ArrowRight, Clock, AlertTriangle, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleSEO } from "@/components/guides/article/ArticleSEO";
import type { CompactGuide } from "@/data/guides/compact";
import { getGuideBySlug } from "@/data/guides/compact";

interface Props {
  guide: CompactGuide;
  canonicalPath: string;
}

export const CompactGuideRenderer = ({ guide, canonicalPath }: Props) => {
  const url = `https://cogniq.se${canonicalPath}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.metaDescription,
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: { "@type": "Organization", name: "Cogniq" },
    publisher: {
      "@type": "Organization",
      name: "Cogniq",
      logo: { "@type": "ImageObject", url: "https://cogniq.se/og-image.jpg" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: guide.keywords.join(", "),
    inLanguage: "sv-SE",
  };

  const relatedGuides = guide.related
    .map((slug) => {
      const g = getGuideBySlug(slug);
      if (!g) return null;
      const data = g.data;
      const title = "h1" in data ? data.h1 : (data as any).title;
      return {
        slug,
        title: title.split("—")[0].split("?")[0].trim(),
        excerpt: "excerpt" in data ? data.excerpt : "",
        readingTime: "readingTime" in data ? data.readingTime : 5,
      };
    })
    .filter(Boolean) as Array<{ slug: string; title: string; excerpt: string; readingTime: number }>;

  return (
    <>
      <ArticleSEO
        title={guide.metaTitle}
        description={guide.metaDescription}
        canonicalPath={canonicalPath}
        jsonLd={[articleJsonLd]}
      />

      {/* Hero */}
      <section className="pt-20 pb-10 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto max-w-[760px] px-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#3b82f6]">
            <BookOpen className="w-3 h-3" />
            {guide.category}
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-[#0F172A]">
            {guide.h1}
          </h1>
          <p className="mt-4 text-lg text-[#475569] leading-relaxed">{guide.lead}</p>
          <div className="mt-5 flex items-center gap-4 text-xs text-[#94a3b8]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {guide.readingTime} min läsning
            </span>
            <span>Uppdaterad {guide.updatedAt}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <article className="container mx-auto max-w-[760px] px-6 py-12 text-[17px] leading-[1.75] text-slate-700">
        {guide.sections.map((s, i) => (
          <section key={i} className="mb-10">
            <h2 className="text-[24px] font-semibold tracking-tight text-[#0F172A] mb-4">
              {s.heading}
            </h2>
            <div className="space-y-4">
              {s.body.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
            {s.list && (
              <ul className="mt-4 space-y-2">
                {s.list.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 leading-relaxed">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* Mistakes */}
        <section className="my-12 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-7">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#7A5417]" />
            <h2 className="text-xl font-semibold text-[#0F172A]">Vanliga fel</h2>
          </div>
          <ul className="space-y-4">
            {guide.mistakes.map((m, i) => (
              <li key={i}>
                <div className="font-semibold text-[#0F172A]">{m.title}</div>
                <p className="mt-1 text-sm text-[#475569] leading-relaxed">{m.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Cogniq block */}
        <section className="my-12 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#0F172A] p-8 text-white">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#3b82f6]">
            <Sparkles className="w-3.5 h-3.5" /> Hur Cogniq hjälper
          </div>
          <p className="mt-3 text-white/85 leading-relaxed">{guide.northledgerNote}</p>
          <Button asChild className="mt-5 bg-white text-[#0F172A] hover:bg-white/90 font-semibold gap-1.5">
            <Link to="/auth">
              Testa Cogniq gratis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </section>

        {/* Related */}
        {relatedGuides.length > 0 && (
          <section className="my-12">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#0F172A] mb-5">
              Relaterade guider
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {relatedGuides.map((r) => (
                <Link
                  key={r.slug}
                  to={`/resources/accounting-guides/${r.slug}`}
                  className="group flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 hover:border-[#C8DDF5] hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="text-[14px] font-semibold text-[#0F172A] group-hover:text-[#3b82f6] transition-colors">
                      {r.title}
                    </div>
                    <div className="mt-1 text-xs text-[#94a3b8]">{r.readingTime} min läsning</div>
                  </div>
                  <ArrowRight className="w-4 h-4 mt-0.5 text-[#3b82f6] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
};
