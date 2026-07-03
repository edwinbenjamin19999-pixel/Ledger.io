// Generate NorthLedger articles via Lovable AI Gateway with structured tool-calling.
// Admin-only. Returns Article[] matching src/data/guides/articles/types.ts schema.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

// In-memory rate limiter — 5 requests/min/user
const rateLimit = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (rateLimit.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return true;
  arr.push(now);
  rateLimit.set(userId, arr);
  return false;
}

interface ValidationIssue { field: string; message: string }
function validateArticle(a: any): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const push = (f: string, m: string) => out.push({ field: f, message: m });
  if (!a.slug || !/^[a-z0-9-]+$/.test(a.slug)) push("slug", "must be kebab-case");
  if (!a.h1 || a.h1.length < 10) push("h1", "missing or too short");
  if (!a.metaTitle || a.metaTitle.length > 60) push("metaTitle", `≤60 chars (got ${a.metaTitle?.length ?? 0})`);
  if (!a.metaDescription || a.metaDescription.length < 120 || a.metaDescription.length > 160)
    push("metaDescription", `120–160 chars (got ${a.metaDescription?.length ?? 0})`);
  if (!Array.isArray(a.intro) || a.intro.length < 1) push("intro", "≥1 paragraph");
  if (!Array.isArray(a.summary) || a.summary.length < 3) push("summary", "≥3 bullets");
  if (!Array.isArray(a.faq) || a.faq.length < 3) push("faq", "≥3 Q&A");
  if (!a.internalLinks?.related || a.internalLinks.related.length < 2)
    push("internalLinks.related", "≥2 related slugs");
  if (!a.example?.lines || a.example.lines.length < 2) push("example.lines", "≥2 journal lines");
  return out;
}

const ARTICLE_TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "emit_article",
    description: "Emit a complete NorthLedger article matching the master template schema.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        slug: { type: "string", description: "kebab-case URL slug" },
        h1: { type: "string" },
        metaTitle: { type: "string", description: "≤60 chars, keyword first" },
        metaDescription: { type: "string", description: "120–160 chars" },
        keywords: { type: "array", items: { type: "string" } },
        intent: { type: "string", enum: ["beginner", "transactional", "compliance", "business"] },
        tier: { type: "number", enum: [1, 2, 3] },
        readingTime: { type: "number" },
        updatedAt: { type: "string", description: "ISO date YYYY-MM-DD" },
        excerpt: { type: "string" },
        subtitle: { type: "string" },
        category: { type: "string" },
        intro: { type: "array", items: { type: "string" }, minItems: 2 },
        problem: {
          type: "object", additionalProperties: false,
          properties: {
            body: { type: "array", items: { type: "string" } },
            mistakes: { type: "array", items: { type: "string" } },
          },
          required: ["body"],
        },
        steps: {
          type: "array", minItems: 3,
          items: {
            type: "object", additionalProperties: false,
            properties: { title: { type: "string" }, body: { type: "string" }, example: { type: "string" } },
            required: ["title", "body"],
          },
        },
        sections: {
          type: "array", minItems: 2,
          items: {
            type: "object", additionalProperties: false,
            properties: {
              id: { type: "string" }, heading: { type: "string" },
              body: { type: "array", items: { type: "string" } },
              list: {
                type: "object", additionalProperties: false,
                properties: { title: { type: "string" }, items: { type: "array", items: { type: "string" } } },
                required: ["items"],
              },
            },
            required: ["id", "heading", "body"],
          },
        },
        northledgerSolution: {
          type: "object", additionalProperties: false,
          properties: {
            intro: { type: "string" },
            comparison: {
              type: "array", minItems: 3,
              items: {
                type: "object", additionalProperties: false,
                properties: { manual: { type: "string" }, northledger: { type: "string" } },
                required: ["manual", "northledger"],
              },
            },
          },
          required: ["intro", "comparison"],
        },
        example: {
          type: "object", additionalProperties: false,
          properties: {
            title: { type: "string" }, scenario: { type: "string" }, note: { type: "string" },
            lines: {
              type: "array", minItems: 2,
              items: {
                type: "object", additionalProperties: false,
                properties: {
                  account: { type: "string", description: "BAS account number, e.g. 4010" },
                  label: { type: "string" },
                  debit: { type: "number" },
                  credit: { type: "number" },
                },
                required: ["account", "label"],
              },
            },
          },
          required: ["title", "scenario", "lines"],
        },
        mistakes: {
          type: "array", minItems: 3,
          items: {
            type: "object", additionalProperties: false,
            properties: { title: { type: "string" }, body: { type: "string" } },
            required: ["title", "body"],
          },
        },
        summary: { type: "array", items: { type: "string" }, minItems: 3 },
        faq: {
          type: "array", minItems: 3,
          items: {
            type: "object", additionalProperties: false,
            properties: { q: { type: "string" }, a: { type: "string" } },
            required: ["q", "a"],
          },
        },
        internalLinks: {
          type: "object", additionalProperties: false,
          properties: {
            related: { type: "array", items: { type: "string" }, minItems: 2 },
            product: {
              type: "object", additionalProperties: false,
              properties: { label: { type: "string" }, href: { type: "string" } },
              required: ["label", "href"],
            },
            category: {
              type: "object", additionalProperties: false,
              properties: { label: { type: "string" }, href: { type: "string" } },
              required: ["label", "href"],
            },
          },
          required: ["related"],
        },
      },
      required: [
        "slug", "h1", "metaTitle", "metaDescription", "keywords", "intent", "tier",
        "readingTime", "updatedAt", "excerpt", "subtitle", "intro", "problem", "steps",
        "sections", "northledgerSolution", "example", "mistakes", "summary", "faq", "internalLinks",
      ],
    },
  },
};

function buildSystemPrompt(availableSlugs: string[]): string {
  return `Du är NorthLedger:s seniora SEO-redaktör för svensk bokföring och skatt.
Du skriver för småföretagare och redovisningskonsulter — ton: smart rådgivare, inte akademiker.

KRAV:
- Språk: svenska (sv-SE).
- Längd: 1500–2000 ord totalt över alla sektioner.
- BAS-kontoplan: använd korrekta konton (1910 kassa/bank, 2440 lev.skuld, 2611 utg.moms 25%, 2641 ing.moms 25%, 4010 inköp varor, 6230 datakommunikation, 5410 förbrukn.inv, etc.).
- Debit/credit i example.lines MÅSTE balansera (summa debit = summa credit).
- metaTitle: max 60 tecken, primärt keyword först.
- metaDescription: 120–160 tecken (räkna noga), inkludera value + keyword.
- intro: 2–4 paragrafer (problem + löfte).
- steps: 3–6 konkreta steg med titel + body + (frivilligt) example.
- sections: 2–4 djupgående avsnitt (id i kebab-case).
- northledgerSolution.comparison: 3–5 par med "manual" (vad man gör manuellt) vs "northledger" (hur NorthLedger automatiserar).
- mistakes: minst 3 typiska fel.
- summary: minst 3 takeaways.
- faq: minst 3 Q&A på sökintent-frågor.
- internalLinks.related: VÄLJ EXAKT 2–3 slugs FRÅN denna lista (hitta inte på nya): ${availableSlugs.join(", ")}.
- internalLinks.product: { label: "Prova NorthLedger gratis", href: "/auth" }.
- internalLinks.category: { label: "Alla bokföringsguider", href: "/resources/accounting-guides" }.
- updatedAt: dagens datum i ISO YYYY-MM-DD.
- slug: kebab-case, härled från keyword.
- intent: matcha användarens nivå.
- tier: 1 (hög volym), 2 (medium), 3 (nisch).

NorthLedger:s produktvärde att lyfta: AI-bokföring (95% autonomi), automatisk momshantering, BankID-signering, integration med Skatteverket/Bolagsverket/banker, SIE-export, realtidsrapporter.

SVARA ENDAST genom att kalla verktyget emit_article med ett komplett objekt.`;
}

function buildUserPrompt(topic: string, keyword: string, difficulty: string): string {
  return `Generera en komplett NorthLedger-artikel.

Topic: ${topic}
Target keyword: ${keyword}
Nivå/intent: ${difficulty}

Följ master-mallens 11 sektioner exakt. Säkerställ att example.lines balanserar debet/kredit och att metaTitle/metaDescription håller längden.`;
}

async function generateOne(opts: {
  topic: string; keyword: string; difficulty: string; availableSlugs: string[];
}): Promise<{ article: any; issues: ValidationIssue[] }> {
  const messages = [
    { role: "system", content: buildSystemPrompt(opts.availableSlugs) },
    { role: "user", content: buildUserPrompt(opts.topic, opts.keyword, opts.difficulty) },
  ];

  let lastIssues: ValidationIssue[] = [];
  let lastArticle: any = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await callAIWithFallback({
      ...MODEL_CHAINS.complexReasoning,
      messages,
      tools: [ARTICLE_TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "emit_article" } },
    });
    const toolCall = result.data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a tool call");
    }
    let parsed: any;
    try { parsed = JSON.parse(toolCall.function.arguments); }
    catch (e) { throw new Error("AI returned invalid JSON: " + (e as Error).message); }

    parsed.intent = parsed.intent || opts.difficulty;
    parsed.tier = parsed.tier || 2;
    parsed.keywords = parsed.keywords || [opts.keyword];

    const issues = validateArticle(parsed);
    lastArticle = parsed;
    lastIssues = issues;
    if (issues.length === 0) return { article: parsed, issues: [] };

    // Re-prompt with feedback
    messages.push({
      role: "assistant",
      content: `(previous attempt had issues: ${issues.map((i) => `${i.field}: ${i.message}`).join("; ")})`,
    });
    messages.push({
      role: "user",
      content: `Korrigera ENDAST följande problem och returnera hela artikeln igen:\n${issues.map((i) => `- ${i.field}: ${i.message}`).join("\n")}`,
    });
  }

  return { article: lastArticle, issues: lastIssues };
}

function articleToTsCode(a: any): string {
  const varName = a.slug.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
  return `import type { Article } from "./types";

// Auto-generated by AI Content Studio. Review before committing.
export const ${varName}: Article = ${JSON.stringify(a, null, 2)};
`;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return corsError("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await (supabase.auth as any).getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return corsError("Unauthorized", 401);
    const userId = claims.claims.sub as string;

    // Admin check via has_role (no company scope -> global admin)
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    if (!roleRows || roleRows.length === 0) return corsError("Admin access required", 403);

    if (isRateLimited(userId)) return corsError("För många förfrågningar — försök igen om en minut.", 429);

    const body = await req.json();
    const topic = String(body.topic || "").trim();
    const keyword = String(body.keyword || "").trim();
    const difficulty = String(body.difficulty || "transactional");
    const batchSize = Math.min(Math.max(Number(body.batchSize) || 1, 1), 5);
    const availableSlugs: string[] = Array.isArray(body.availableSlugs) ? body.availableSlugs.slice(0, 50) : [];

    if (topic.length < 3 || topic.length > 200) return corsError("topic: 3–200 tecken", 400);
    if (keyword.length < 2 || keyword.length > 100) return corsError("keyword: 2–100 tecken", 400);
    if (!["beginner", "transactional", "compliance", "business"].includes(difficulty))
      return corsError("invalid difficulty", 400);

    const articles: any[] = [];
    const tsFiles: { slug: string; code: string }[] = [];
    const errors: { index: number; message: string; issues?: ValidationIssue[] }[] = [];

    for (let i = 0; i < batchSize; i++) {
      try {
        const variantTopic = batchSize > 1 ? `${topic} (variant ${i + 1}/${batchSize} — använd unik vinkel)` : topic;
        const { article, issues } = await generateOne({ topic: variantTopic, keyword, difficulty, availableSlugs });
        articles.push(article);
        tsFiles.push({ slug: article.slug, code: articleToTsCode(article) });
        if (issues.length > 0) errors.push({ index: i, message: "Validation warnings", issues });
        if (i < batchSize - 1) await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        errors.push({ index: i, message: (e as Error).message });
      }
    }

    return corsJson({ articles, tsFiles, errors });
  } catch (e) {
    console.error("[generate-article] error:", e);
    return corsError((e as Error).message || "Internal error", 500);
  }
});
