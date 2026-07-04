/**
 * DS Table v1 — visual primitives for Cogniq data tables.
 *
 * Pure presentation. No sorting/pagination/filter logic — wire those in the
 * caller (just pass `sortDir` to <DSTh sortDir="asc"> and your own onClick).
 *
 * Spec source: Cogniq design system — table standard.
 */
import { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes, InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------ Wrapper ------------------------------ */

export const DSTableWrapper = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

export const DSTable = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, children, ...rest }, ref) => (
    <table ref={ref} className={cn("w-full border-collapse", className)} {...rest}>
      {children}
    </table>
  ),
);
DSTable.displayName = "DSTable";

/* ------------------------------ Header ------------------------------ */

export const DSThead = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={className} {...rest}>
    {children}
  </thead>
);

export const DSHeaderRow = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      "bg-[#F8FAFB] border-b-[0.5px] border-[#E2E8F0]",
      className,
    )}
    {...rest}
  >
    {children}
  </tr>
);

type SortDir = "asc" | "desc" | null | undefined;

interface DSThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sortDir?: SortDir;
}

export const DSTh = ({
  className,
  align = "left",
  sortable,
  sortDir,
  children,
  ...rest
}: DSThProps) => {
  const arrow = sortable
    ? sortDir === "asc"
      ? " ↑"
      : sortDir === "desc"
        ? " ↓"
        : " ↕"
    : "";
  return (
    <th
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] px-[10px] py-[8px]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        sortable && "cursor-pointer hover:text-[#0F172A] select-none",
        className,
      )}
      {...rest}
    >
      {children}
      {sortable && <span className="text-[#94A3B8]">{arrow}</span>}
    </th>
  );
};

/* ------------------------------ Body / Rows ------------------------------ */

export const DSTbody = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={className} {...rest}>
    {children}
  </tbody>
);

interface DSRowProps extends HTMLAttributes<HTMLTableRowElement> {
  variant?: "default" | "selected" | "overdue" | "expanded";
  interactive?: boolean;
}

export const DSRow = ({
  className,
  variant = "default",
  interactive = true,
  children,
  ...rest
}: DSRowProps) => (
  <tr
    className={cn(
      "border-b-[0.5px] border-[#F1F5F9]",
      variant === "default" && "bg-white",
      variant === "selected" && "bg-[#EFF6FF]",
      variant === "overdue" && "bg-[#FFF8F8]",
      variant === "expanded" && "bg-[#F8FAFB]",
      interactive && "hover:bg-[#F8FAFB] transition-colors",
      className,
    )}
    {...rest}
  >
    {children}
  </tr>
);

/* ------------------------------ Cells ------------------------------ */

interface DSTdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  truncate?: boolean;
}

export const DSTd = ({
  className,
  align = "left",
  truncate = true,
  children,
  ...rest
}: DSTdProps) => (
  <td
    className={cn(
      "text-[12px] text-[#475569] px-[10px] py-[9px]",
      align === "right" && "text-right",
      align === "center" && "text-center",
      truncate && "overflow-hidden text-ellipsis whitespace-nowrap",
      className,
    )}
    {...rest}
  >
    {children}
  </td>
);

/** Primary text (names, descriptions) — 12px medium #0F172A */
export const DSPrimary = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("text-[12px] font-medium text-[#0F172A]", className)}>{children}</span>
);

/** Mono identifiers (invoice nr, ver.nr, account nr, org.nr) — 11px mono */
export const DSCode = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("font-mono text-[11px] text-[#475569]", className)}>{children}</span>
);

/** Right-aligned tabular money */
export const DSAmount = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("tabular-nums font-medium text-[#0F172A]", className)}>{children}</span>
);

/** Date cell — overdue prop turns it red */
export const DSDate = ({
  children,
  overdue,
  sub,
  className,
}: {
  children: ReactNode;
  overdue?: boolean;
  sub?: ReactNode;
  className?: string;
}) => (
  <span className={cn("flex flex-col leading-tight", className)}>
    <span
      className={cn(
        "text-[12px]",
        overdue ? "text-[#791F1F] font-medium" : "text-[#475569]",
      )}
    >
      {children}
    </span>
    {sub && <span className="text-[10px] text-[#94A3B8] mt-0.5">{sub}</span>}
  </span>
);

/* ------------------------------ Checkbox ------------------------------ */

interface DSCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  indeterminate?: boolean;
}

export const DSCheckbox = ({
  className,
  checked,
  indeterminate,
  ...rest
}: DSCheckboxProps) => {
  const isOn = !!checked || !!indeterminate;
  return (
    <span
      className={cn(
        "inline-flex w-[14px] h-[14px] rounded-[3px] border-[1.5px] items-center justify-center transition-colors",
        isOn
          ? "bg-[#0040CC] border-[#0040CC]"
          : "bg-white border-[#D1D5DB]",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={!!checked}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
        }}
        className="sr-only"
        {...rest}
      />
      {indeterminate ? (
        <span className="block w-[8px] h-[1.5px] bg-white rounded-full" />
      ) : checked ? (
        <svg viewBox="0 0 14 14" className="w-[10px] h-[10px] text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 7.5l2.5 2.5L11 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
};

/* ------------------------------ Status Badge ------------------------------ */

export type DSStatusTone = "approved" | "pending" | "overdue" | "info";

const STATUS_TONE: Record<DSStatusTone, string> = {
  approved: "bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5]",
  pending: "bg-[#FAEEDA] text-[#412402] border-[0.5px] border-[#EF9F27]",
  overdue: "bg-[#FCEBEB] text-[#501313] border-[0.5px] border-[#F09595]",
  info: "bg-[#EFF6FF] text-[#0C447C] border-[0.5px] border-[#B5D4F4]",
};

export const DSStatusBadge = ({
  tone,
  children,
  className,
}: {
  tone: DSStatusTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full text-[10px] font-medium px-[8px] py-px",
      STATUS_TONE[tone],
      className,
    )}
  >
    {children}
  </span>
);

/* ------------------------------ Risk dot ------------------------------ */

export type DSRiskTone = "safe" | "medium" | "high";

const RISK_DOT: Record<DSRiskTone, string> = {
  safe: "bg-[#1D9E75]",
  medium: "bg-[#EF9F27]",
  high: "bg-[#E24B4A]",
};

export const DSRiskDot = ({ tone, className }: { tone: DSRiskTone; className?: string }) => (
  <span
    className={cn(
      "inline-block w-[7px] h-[7px] rounded-full mr-[5px] flex-shrink-0",
      RISK_DOT[tone],
      className,
    )}
  />
);

/* ------------------------------ AI Confidence bar ------------------------------ */

const confidenceTone = (pct: number) => {
  if (pct >= 80) return { fill: "bg-[#1D9E75]", text: "text-[#0F6E56]" };
  if (pct >= 50) return { fill: "bg-[#EF9F27]", text: "text-[#633806]" };
  return { fill: "bg-[#E24B4A]", text: "text-[#791F1F]" };
};

export const DSConfidence = ({
  value,
  showLabel = true,
  className,
}: {
  /** 0–100 */
  value: number;
  showLabel?: boolean;
  className?: string;
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const tone = confidenceTone(pct);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="w-[48px] h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden inline-block">
        <span
          className={cn("block h-full rounded-full", tone.fill)}
          style={{ width: `${pct}%` }}
        />
      </span>
      {showLabel && (
        <span className={cn("text-[11px] font-medium tabular-nums", tone.text)}>{pct}%</span>
      )}
    </span>
  );
};

/* ------------------------------ Footer ------------------------------ */

export const DSTableFooter = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-white border-t-[0.5px] border-[#E2E8F0] px-[16px] py-[9px] flex items-center justify-between",
      className,
    )}
  >
    {children}
  </div>
);

export const DSFooterText = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("text-[11px] text-[#94A3B8]", className)}>{children}</span>
);
