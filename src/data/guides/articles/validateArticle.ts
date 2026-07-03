import type { Article } from "./types";

interface ValidationIssue {
  slug: string;
  field: string;
  message: string;
}

export const validateArticle = (a: Article): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const push = (field: string, message: string) => issues.push({ slug: a.slug, field, message });

  if (!a.metaTitle || a.metaTitle.length > 60) {
    push("metaTitle", `must be ≤60 chars (current: ${a.metaTitle?.length ?? 0})`);
  }
  if (!a.metaDescription || a.metaDescription.length < 120 || a.metaDescription.length > 160) {
    push("metaDescription", `must be 120–160 chars (current: ${a.metaDescription?.length ?? 0})`);
  }
  if (!a.intro || a.intro.length < 1) push("intro", "requires ≥1 paragraph");
  if (!a.summary || a.summary.length < 3) push("summary", "requires ≥3 bullets");
  if (!a.faq || a.faq.length < 3) push("faq", "requires ≥3 Q&A pairs");
  if (!a.internalLinks?.related || a.internalLinks.related.length < 2) {
    push("internalLinks.related", "requires ≥2 related slugs");
  }
  return issues;
};

export const validateAllArticles = (articles: Article[]): void => {
  if (!import.meta.env.DEV) return;
  const all = articles.flatMap(validateArticle);
  if (all.length === 0) return;
  // eslint-disable-next-line no-console
  console.warn(
    `[ArticleTemplate] ${all.length} validation issue(s) detected:\n` +
      all.map((i) => `  • [${i.slug}] ${i.field}: ${i.message}`).join("\n"),
  );
};
