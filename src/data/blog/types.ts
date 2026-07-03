export type CategoryId =
  | "ai-bokforing"
  | "moms"
  | "guider"
  | "tillvaxt"
  | "byra-wl"
  | "produktnyheter";

export interface Category {
  id: CategoryId;
  label: string;
  tint: string; // bg class
  text: string; // text class
}

export type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "cta"; title: string; href: string };

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: CategoryId;
  readingTime: number;
  publishedAt: string;
  author: string;
  featured?: boolean;
  popular?: boolean;
  status: "published" | "planned";
  content?: ContentBlock[];
}
