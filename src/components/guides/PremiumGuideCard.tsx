import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";

interface Props {
  to: string;
  title: string;
  excerpt: string;
  readingTime: number;
}

export const PremiumGuideCard = ({ to, title, excerpt, readingTime }: Props) => (
  <Link
    to={to}
    className="group relative flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/40 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-[#C8DDF5] hover:shadow-[0_8px_24px_-8px_rgba(8,145,178,0.18)]"
  >
    <div className="min-w-0">
      <h3 className="text-[15px] font-semibold text-[#0f1f35] leading-snug group-hover:text-[#3b82f6] transition-colors">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-[#64748b] leading-relaxed">{excerpt}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#94a3b8]">
        <Clock className="w-3 h-3" /> {readingTime} min läsning
      </div>
    </div>
    <ArrowRight className="w-4 h-4 mt-1 text-[#3b82f6] group-hover:translate-x-1 transition-transform shrink-0" />
  </Link>
);
