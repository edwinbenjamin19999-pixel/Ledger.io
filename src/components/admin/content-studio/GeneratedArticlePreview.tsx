import { Copy, Download, RefreshCw, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Article } from "@/data/guides/articles/types";
import { MasterArticleTemplate } from "@/components/article/MasterArticleTemplate";
import { ValidationChecklist } from "./ValidationChecklist";
import { downloadTsFile } from "@/lib/articleToTsCode";

interface Props {
  article: Article;
  tsCode: string;
  onRegenerate?: () => void;
}

export const GeneratedArticlePreview = ({ article, tsCode, onRegenerate }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tsCode);
    setCopied(true);
    toast({ title: "Kopierat", description: `${article.slug}.ts i urklipp` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-900/[0.06] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mr-auto">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Slug</p>
          <p className="font-mono text-sm font-medium text-slate-900">{article.slug}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          Kopiera TS
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadTsFile(article.slug, tsCode)}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Ladda ner .ts
        </Button>
        {onRegenerate && (
          <Button size="sm" variant="outline" onClick={onRegenerate}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Regenerera
          </Button>
        )}
      </div>

      {/* SEO meta + validation */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-900/[0.06] bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SEO meta</p>
          <p className="text-sm font-medium text-slate-900">{article.metaTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{article.metaDescription}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {article.keywords.map((k) => (
              <span key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{k}</span>
            ))}
          </div>
        </div>
        <ValidationChecklist article={article} />
      </div>

      {/* Live preview */}
      <div className="overflow-hidden rounded-xl border border-slate-900/[0.06] bg-[#FAFBFC]">
        <div className="flex items-center justify-between border-b border-slate-900/[0.06] bg-white px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Live preview</span>
          <span className="text-xs text-slate-500">{article.readingTime} min · {article.intent}</span>
        </div>
        <div className="max-h-[800px] overflow-y-auto">
          <MasterArticleTemplate article={article} canonicalPath={`/resources/accounting-guides/${article.slug}`} />
        </div>
      </div>
    </div>
  );
};
