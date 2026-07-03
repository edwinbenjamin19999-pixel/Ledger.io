import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

interface Props {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  count: number;
}

export const GuideCategoryCard = ({ id, label, description, icon: Icon, count }: Props) => (
  <Link
    to={`#${id}`}
    className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200"
  >
    <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
      <Icon className="w-5 h-5 text-[#3b82f6]" />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-[#0f1f35] group-hover:text-[#3b82f6] transition-colors">{label}</h3>
    <p className="mt-1.5 text-sm text-[#64748b] leading-relaxed">{description}</p>
    <div className="mt-auto pt-5 flex items-center justify-between text-xs text-[#94a3b8]">
      <span>{count} guider</span>
      <ArrowRight className="w-4 h-4 text-[#3b82f6] group-hover:translate-x-0.5 transition-transform" />
    </div>
  </Link>
);
