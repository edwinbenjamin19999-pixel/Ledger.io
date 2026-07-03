import { ArrowRight, Clock } from "lucide-react";
import type { Guide } from "@/data/guides/guides";

export const GuideCard = ({ guide }: { guide: Guide }) => (
  <div className="group flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white p-5 hover:border-[#C8DDF5] hover:shadow-sm transition-all duration-150">
    <div>
      <h4 className="text-[15px] font-semibold text-[#0F1B2D] leading-snug group-hover:text-[#3b82f6] transition-colors">{guide.title}</h4>
      <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{guide.excerpt}</p>
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#94a3b8]">
        <Clock className="w-3 h-3" />{guide.readingTime} min
      </div>
    </div>
    <ArrowRight className="w-4 h-4 mt-1 text-[#3b82f6] group-hover:translate-x-0.5 transition-transform shrink-0" />
  </div>
);
