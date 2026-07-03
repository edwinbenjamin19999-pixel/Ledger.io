/**
 * MASTER ARTICLE TEMPLATE — copy this file to create a new article.
 *
 * Steps:
 *  1. Copy this file to a new slug-based filename, e.g. `bokfora-lon.ts`.
 *  2. Fill in every field below (do not leave TODO markers).
 *  3. Add the export to `src/data/guides/articles/index.ts` ARTICLES array.
 *  4. Done — the MasterArticleTemplate renders all 11 sections automatically.
 *
 * Validation runs in dev (see validateArticle.ts) and warns if:
 *  - metaTitle > 60 chars
 *  - metaDescription not 120–160 chars
 *  - intro < 1, summary < 3, faq < 3, related < 2
 */
import type { Article } from "./types";

export const TEMPLATE_ARTICLE: Article = {
  // === Identity & SEO ===
  slug: "todo-slug",
  h1: "TODO — H1 with primary keyword",
  metaTitle: "TODO — ≤60 chars, keyword first",
  metaDescription: "TODO — 120–160 chars, value + keyword + CTA hint.",
  keywords: ["todo-keyword-1", "todo-keyword-2"],
  intent: "transactional", // beginner | transactional | compliance | business
  tier: 2,
  readingTime: 6,
  updatedAt: "2026-04-18",
  excerpt: "TODO — one-sentence card summary.",

  // === 1. Hero ===
  subtitle: "TODO — clear value proposition (1 line).",
  category: "Bokföring", // optional display label

  // === 2. Intro (3–5 sentences) ===
  intro: [
    "TODO — what the user will learn.",
    "TODO — why it matters now.",
  ],

  // === 3. Problem ===
  problem: {
    body: [
      "TODO — describe the manual process and why it's painful.",
    ],
    mistakes: [
      "TODO — typical confusion point #1",
      "TODO — typical confusion point #2",
    ],
  },

  // === 4. Steps ===
  steps: [
    { title: "TODO step 1", body: "TODO explanation.", example: "TODO inline example." },
    { title: "TODO step 2", body: "TODO explanation." },
    { title: "TODO step 3", body: "TODO explanation." },
  ],

  // === 6. Bokfy Solution ===
  northledgerSolution: {
    intro: "TODO — one paragraph on how Bokfy removes the work.",
    comparison: [
      { manual: "TODO manual pain", northledger: "TODO Bokfy benefit" },
      { manual: "TODO manual pain", northledger: "TODO Bokfy benefit" },
      { manual: "TODO manual pain", northledger: "TODO Bokfy benefit" },
    ],
  },

  // === 7. Example (real journal entry) ===
  example: {
    title: "TODO — example title",
    scenario: "TODO — short scenario (e.g. 'Du köper kontorsmaterial för 250 kr inkl. moms').",
    lines: [
      { account: "6110", label: "Kontorsmaterial", debit: 200 },
      { account: "2641", label: "Ingående moms", debit: 50 },
      { account: "1930", label: "Bankkonto", credit: 250 },
    ],
    note: "TODO — optional clarifying note.",
  },

  // === 8. Common mistakes ===
  mistakes: [
    { title: "TODO — mistake 1", body: "TODO explanation." },
    { title: "TODO — mistake 2", body: "TODO explanation." },
    { title: "TODO — mistake 3", body: "TODO explanation." },
  ],

  // === Legacy free-form sections (optional — leave [] if using steps) ===
  sections: [],

  // === 9. Summary ===
  summary: [
    "TODO — key takeaway 1",
    "TODO — key takeaway 2",
    "TODO — key takeaway 3",
  ],

  // === FAQ (≥3) ===
  faq: [
    { q: "TODO question 1?", a: "TODO answer." },
    { q: "TODO question 2?", a: "TODO answer." },
    { q: "TODO question 3?", a: "TODO answer." },
  ],

  // === 11. Internal linking ===
  internalLinks: {
    related: ["bokfora-kvitto", "moms-sverige"], // ≥2 slugs from ARTICLES
    product: { label: "Se Bokfy bokföring", href: "/auth" },
    category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" },
  },
};
