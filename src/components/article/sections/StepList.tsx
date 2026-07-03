import type { ArticleStep } from "@/data/guides/articles/types";

export const StepList = ({ steps }: { steps: ArticleStep[] }) => (
  <section className="my-14">
    <h2>Steg för steg</h2>
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li
          key={i}
          className="group rounded-[18px] border border-slate-900/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-start gap-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#3b82f6] text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.4)]">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-semibold text-[#0F1B2D] tracking-tight">{step.title}</h3>
              <p className="mt-2 text-slate-700 leading-[1.75] !mb-0">{step.body}</p>
              {step.example && (
                <blockquote className="mt-4 rounded-r-lg border-l-2 border-[#3b82f6] bg-slate-50 px-4 py-3 text-[15px] italic text-slate-600">
                  {step.example}
                </blockquote>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  </section>
);
