export type Intent = "beginner" | "transactional" | "compliance" | "business";
export type Tier = 1 | 2 | 3;

export interface JournalLine {
  account: string;
  label: string;
  debit?: number;
  credit?: number;
}

export interface JournalExampleData {
  title: string;
  scenario: string;
  lines: JournalLine[];
  note?: string;
}

export interface ArticleSection {
  id: string;
  heading: string;
  body: string[];
  list?: { title?: string; items: string[] };
}

export interface ArticleFAQ {
  q: string;
  a: string;
}

export interface InternalLinks {
  related: string[]; // slugs
  product?: { label: string; href: string };
  category?: { label: string; href: string };
}

export interface ArticleStep {
  title: string;
  body: string;
  example?: string;
}

export interface SolutionComparison {
  intro: string;
  comparison: { manual: string; northledger: string }[];
}

export interface ProblemBlockData {
  body: string[];
  mistakes?: string[];
}

export interface Article {
  slug: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  intent: Intent;
  tier: Tier;
  readingTime: number;
  updatedAt: string; // ISO date
  intro: string[];
  sections: ArticleSection[];
  example: JournalExampleData;
  mistakes: { title: string; body: string }[];
  summary: string[];
  faq: ArticleFAQ[];
  internalLinks: InternalLinks;
  excerpt: string;
  // Master template (all optional — additive, backward-compatible)
  subtitle?: string;
  category?: string;
  problem?: ProblemBlockData;
  steps?: ArticleStep[];
  northledgerSolution?: SolutionComparison;
}

// Roadmap stub for "coming soon" cards on index
export interface ArticleStub {
  slug: string;
  title: string;
  excerpt: string;
  intent: Intent;
  tier: Tier;
  comingSoon: true;
}
