import { AlertCircle } from "lucide-react";
import type { ProblemBlockData } from "@/data/guides/articles/types";

export const ProblemBlock = ({ data }: { data: ProblemBlockData }) => (
  <section className="my-14">
    <h2>Det vanliga sättet — och varför det är jobbigt</h2>
    <div className="relative rounded-2xl border border-slate-900/[0.06] bg-[#F1F5F9] p-7">
      <div className="absolute -top-3 left-7 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 border border-amber-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <AlertCircle className="h-4 w-4 text-amber-600" />
      </div>
      <div className="mt-2 space-y-4 text-slate-700 leading-[1.75]">
        {data.body.map((p, i) => <p key={i} className="!mb-0">{p}</p>)}
      </div>
      {data.mistakes && data.mistakes.length > 0 && (
        <ul className="mt-5 space-y-2 rounded-xl bg-white/60 backdrop-blur border border-white/80 p-4">
          {data.mistakes.map((m, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
);
