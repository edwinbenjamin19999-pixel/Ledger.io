import type { Article } from "./types";
import { bokforaKvitto } from "./bokfora-kvitto";
import { bokforaFaktura } from "./bokfora-faktura";
import { vadArBokforing } from "./vad-ar-bokforing";
import { debetKredit } from "./debet-kredit";
import { momsSverige } from "./moms-sverige";
import { kassaflode } from "./kassaflode";
import { nyckeltalSmaforetag } from "./nyckeltal-smaforetag";
import { momsdeklaration } from "./momsdeklaration";
import { euMomsOmvandSkattskyldighet } from "./eu-moms-omvand-skattskyldighet";
import { validateAllArticles } from "./validateArticle";

export const ARTICLES: Article[] = [
  bokforaKvitto,
  bokforaFaktura,
  vadArBokforing,
  debetKredit,
  momsSverige,
  kassaflode,
  nyckeltalSmaforetag,
  momsdeklaration,
  euMomsOmvandSkattskyldighet,
];

export const ARTICLES_BY_SLUG: Record<string, Article> = Object.fromEntries(
  ARTICLES.map((a) => [a.slug, a]),
);

// Canonical lookup — prefers guides, falls back to blog (future migration target).
export const getCanonicalArticle = (slug: string): Article | undefined =>
  ARTICLES_BY_SLUG[slug];

// Dev-only: surface schema violations in console
validateAllArticles(ARTICLES);

export type { Article, Intent, Tier } from "./types";
