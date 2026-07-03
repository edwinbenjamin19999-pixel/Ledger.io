import { CheckCircle2 } from "lucide-react";
import type { Article } from "@/data/guides/articles/types";
import { ArticleSEO } from "@/components/guides/article/ArticleSEO";
import { ArticleHero } from "@/components/guides/article/ArticleHero";
import { JournalExample } from "@/components/guides/article/JournalExample";
import { MidContentCTA } from "@/components/guides/article/MidContentCTA";
import { MistakesCallout } from "@/components/guides/article/MistakesCallout";
import { RelatedGuides } from "@/components/guides/article/RelatedGuides";
import { FinalCTABlock } from "@/components/guides/article/FinalCTABlock";
import { ArticleFAQList } from "@/components/guides/article/ArticleFAQList";
import { ProblemBlock } from "./sections/ProblemBlock";
import { StepList } from "./sections/StepList";
import { SolutionComparison } from "./sections/SolutionComparison";

interface Props {
  article: Article;
  canonicalPath: string;
}

export const MasterArticleTemplate = ({ article, canonicalPath }: Props) => {
  const url = `https://bokfy.se${canonicalPath}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.h1,
    description: article.metaDescription,
    datePublished: article.updatedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Organization", name: "Bokfy" },
    publisher: {
      "@type": "Organization",
      name: "Bokfy",
      logo: { "@type": "ImageObject", url: "https://bokfy.se/og-image.jpg" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: article.keywords.join(", "),
    inLanguage: "sv-SE",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <ArticleSEO
        title={article.metaTitle}
        description={article.metaDescription}
        canonicalPath={canonicalPath}
        jsonLd={[articleJsonLd, faqJsonLd]}
      />

      <ArticleHero
        h1={article.h1}
        intro={article.subtitle ? [article.subtitle, ...article.intro] : article.intro}
        intent={article.intent}
        readingTime={article.readingTime}
        updatedAt={article.updatedAt}
      />

      <article className="container mx-auto max-w-[760px] px-6 py-16 text-[17px] leading-[1.75] text-slate-700 [&_h2]:text-[26px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[#0f1f35] [&_h2]:mt-14 [&_h2]:mb-5 [&_p]:mb-5">
        {article.problem && <ProblemBlock data={article.problem} />}

        {article.steps && article.steps.length > 0 && <StepList steps={article.steps} />}

        {article.sections.map((section, i) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2>{section.heading}</h2>
            <div className="space-y-4">
              {section.body.map((p, j) => <p key={j}>{p}</p>)}
            </div>
            {section.list && (
              <ul className="mt-4 space-y-2">
                {section.list.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 leading-relaxed">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {!article.steps && i === Math.min(2, article.sections.length - 1) && <MidContentCTA />}
          </section>
        ))}

        {article.steps && article.steps.length > 0 && <MidContentCTA />}

        {article.northledgerSolution && <SolutionComparison data={article.northledgerSolution} />}

        <JournalExample data={article.example} />

        <MistakesCallout items={article.mistakes} />

        <section className="my-14">
          <h2>Sammanfattning</h2>
          <div className="rounded-[20px] border border-slate-900/[0.06] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <ul className="space-y-3">
              {article.summary.map((s, i) => (
                <li key={i} className="flex items-start gap-3 leading-relaxed">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-50">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ArticleFAQList items={article.faq} />

        <FinalCTABlock />

        <RelatedGuides slugs={article.internalLinks.related} />
      </article>
    </>
  );
};
