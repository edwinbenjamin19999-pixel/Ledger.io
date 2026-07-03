import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { Article } from "@/data/guides/articles/types";

interface Rule {
  label: string;
  ok: boolean;
  detail?: string;
}

function rulesFor(a: Article): Rule[] {
  return [
    { label: "Meta title ≤60", ok: !!a.metaTitle && a.metaTitle.length <= 60, detail: `${a.metaTitle?.length ?? 0} tecken` },
    { label: "Meta description 120–160", ok: !!a.metaDescription && a.metaDescription.length >= 120 && a.metaDescription.length <= 160, detail: `${a.metaDescription?.length ?? 0} tecken` },
    { label: "Intro ≥1 paragraf", ok: (a.intro?.length ?? 0) >= 1 },
    { label: "Summary ≥3 takeaways", ok: (a.summary?.length ?? 0) >= 3, detail: `${a.summary?.length ?? 0}` },
    { label: "FAQ ≥3 frågor", ok: (a.faq?.length ?? 0) >= 3, detail: `${a.faq?.length ?? 0}` },
    { label: "Related ≥2 slugs", ok: (a.internalLinks?.related?.length ?? 0) >= 2, detail: `${a.internalLinks?.related?.length ?? 0}` },
    { label: "Verifikat balanserar", ok: (() => {
        const lines = a.example?.lines ?? [];
        const d = lines.reduce((s, l) => s + (l.debit || 0), 0);
        const c = lines.reduce((s, l) => s + (l.credit || 0), 0);
        return Math.abs(d - c) < 0.01 && lines.length >= 2;
      })() },
  ];
}

export const ValidationChecklist = ({ article }: { article: Article }) => {
  const rules = rulesFor(article);
  const passed = rules.filter((r) => r.ok).length;
  return (
    <div className="rounded-xl border border-slate-900/[0.06] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">SEO &amp; struktur</span>
        <span className={`text-xs font-medium ${passed === rules.length ? "text-[#085041]" : "text-[#7A5417]"}`}>
          {passed}/{rules.length}
        </span>
      </div>
      <ul className="space-y-2">
        {rules.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-sm">
            {r.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#085041]" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#7A5417]" />
            )}
            <span className={r.ok ? "text-slate-700" : "text-slate-900 font-medium"}>{r.label}</span>
            {r.detail && <span className="ml-auto text-xs text-slate-500">{r.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};
