/**
 * @deprecated Replaced by inline section header in `Reports.tsx` reading from
 * the unified `FinancialReport` engine. Do not use in new code.
 */
import { ReactNode } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { reportShellClasses } from "@/lib/report-tokens";
import { cn } from "@/lib/utils";

interface ExportAction {
  label: "PDF" | "Excel" | "CSV";
  onClick: () => void;
}

interface ReportTableShellProps {
  title: string;
  fromDate: Date;
  toDate: Date;
  exports?: ExportAction[];
  /** Optional custom action slot (replaces `exports` buttons when provided). */
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const iconColor: Record<ExportAction["label"], string> = {
  PDF: "text-[#7A1A1A]",
  Excel: "text-[#085041]",
  CSV: "text-slate-400",
};

export const ReportTableShell = ({
  title,
  fromDate,
  toDate,
  exports = [],
  actions,
  children,
  footer,
}: ReportTableShellProps) => {
  return (
    <section className={reportShellClasses.card}>
      <header className={reportShellClasses.header}>
        <div>
          <h3 className={reportShellClasses.title}>{title}</h3>
          <p className={reportShellClasses.subtitle}>
            {format(fromDate, "yyyy-MM-dd")} – {format(toDate, "yyyy-MM-dd")}
          </p>
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : exports.length > 0 ? (
          <div className="flex gap-2">
            {exports.map((e) => (
              <button
                key={e.label}
                onClick={e.onClick}
                className={cn(
                  "bg-white dark:bg-slate-800 border border-[rgba(15,23,42,0.08)] dark:border-slate-600",
                  "rounded-xl px-4 py-2 text-[13px] font-medium text-[#334155] dark:text-slate-300",
                  "flex items-center gap-2 transition-all",
                  "hover:border-[rgba(15,23,42,0.16)] hover:bg-[#F8FAFC] dark:hover:bg-slate-700",
                  "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                )}
              >
                <Download className={cn("w-4 h-4", iconColor[e.label])} />
                {e.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      <div className="p-0">{children}</div>
      {footer && (
        <div className="border-t border-[rgba(15,23,42,0.06)] dark:border-slate-800 bg-[#F8FAFC]/60 dark:bg-slate-900/40 px-6 py-5">
          {footer}
        </div>
      )}
    </section>
  );
};
