import type { Intent } from "../articles/types";
import { ARTICLES_BY_SLUG } from "../articles";
import type { Article } from "../articles/types";
import { leverantorsfakturor } from "./leverantorsfakturor";
import { basKontoplanen } from "./bas-kontoplanen";
import { avdragsgillMoms } from "./avdragsgill-moms";
import { bruttomarginalLonsamhet } from "./bruttomarginal-lonsamhet";
import { resultatrapport } from "./resultatrapport";

export interface CompactSection {
  heading: string;
  body: string[];
  list?: string[];
}

export interface CompactGuide {
  slug: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intent: Intent;
  readingTime: number;
  updatedAt: string;
  excerpt: string;
  category: string;
  lead: string;
  sections: CompactSection[];
  mistakes: { title: string; body: string }[];
  northledgerNote: string;
  related: string[]; // slugs (any kind)
  keywords: string[];
}

export const COMPACT_GUIDES: CompactGuide[] = [
  leverantorsfakturor,
  basKontoplanen,
  avdragsgillMoms,
  bruttomarginalLonsamhet,
  resultatrapport,
];

export const COMPACT_BY_SLUG: Record<string, CompactGuide> = Object.fromEntries(
  COMPACT_GUIDES.map((g) => [g.slug, g]),
);

export type GuideUnion =
  | { kind: "article"; data: Article }
  | { kind: "compact"; data: CompactGuide };

export const getGuideBySlug = (slug: string): GuideUnion | undefined => {
  if (ARTICLES_BY_SLUG[slug]) return { kind: "article", data: ARTICLES_BY_SLUG[slug] };
  if (COMPACT_BY_SLUG[slug]) return { kind: "compact", data: COMPACT_BY_SLUG[slug] };
  return undefined;
};
