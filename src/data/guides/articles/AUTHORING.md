# Authoring Guide — Master Article Template

Every article (blog or accounting guide) on Cogniq must follow the **Master Article Template**. This guarantees consistent UX, SEO, and conversion structure.

## Create a new article in 4 steps

1. **Copy the template**
   ```
   cp src/data/guides/articles/_TEMPLATE.ts \
      src/data/guides/articles/<your-slug>.ts
   ```

2. **Fill in every field.** All `TODO` markers must be replaced. Do not skip:
   - SEO meta (`metaTitle` ≤60 chars, `metaDescription` 120–160 chars)
   - `subtitle`, `intro`, `problem`, `steps`, `northledgerSolution`
   - `example` (real journal entry — emerald debit / blue credit)
   - `mistakes`, `summary` (≥3), `faq` (≥3)
   - `internalLinks.related` (≥2 slugs)

3. **Register the article** in `src/data/guides/articles/index.ts`:
   ```ts
   import { yourSlug } from "./your-slug";
   export const ARTICLES: Article[] = [ ..., yourSlug ];
   ```

4. **Done.** Visit `/resources/accounting-guides/<your-slug>` — the `MasterArticleTemplate` renders all 11 sections automatically.

## The 11 mandatory sections (rendered in this order)

| # | Section | Source field |
|---|---------|--------------|
| 1 | Hero | `h1`, `subtitle`, `intent`, `readingTime`, `updatedAt` |
| 2 | Intro | `intro[]` |
| 3 | Problem | `problem` |
| 4 | Step-by-step | `steps[]` |
| 5 | Mid CTA | (auto — "Vill du slippa detta manuellt?") |
| 6 | Cogniq Solution | `northledgerSolution` |
| 7 | Example | `example` (journal entry) |
| 8 | Common mistakes | `mistakes[]` |
| 9 | Summary | `summary[]` |
| 10 | Final CTA | (auto — Testa Cogniq / Boka demo / White Label) |
| 11 | Related | `internalLinks.related[]` |

Plus: dynamic `<title>`, meta description, canonical, OG tags, JSON-LD `Article` + `FAQPage`.

## Validation

Dev mode automatically warns in the browser console if any published article fails the schema (see `validateArticle.ts`). Fix all warnings before publishing.

## Style rules

- **Tone**: smart advisor explaining clearly. No fluff, no academic tone.
- **Length**: 1500–2000 words.
- **Keyword**: must appear in `h1`, `metaTitle`, first 100 words of intro.
- **Internal links**: every article links to ≥2 related articles + `/auth` (product) + `/resources/accounting-guides` (category).
- **Colors**: never invent — `MasterArticleTemplate` enforces the design system.
