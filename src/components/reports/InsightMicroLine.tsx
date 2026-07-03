import { Sparkles } from "lucide-react";

interface InsightMicroLineProps {
  message: string;
  colSpan?: number;
}

export const InsightMicroLine = ({ message, colSpan = 6 }: InsightMicroLineProps) => (
  <tr className="bg-white dark:bg-slate-900">
    <td colSpan={colSpan} className="py-1.5 pl-12 pr-5 text-[11px] italic text-slate-400 dark:text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 opacity-60" />
        {message}
      </span>
    </td>
  </tr>
);
