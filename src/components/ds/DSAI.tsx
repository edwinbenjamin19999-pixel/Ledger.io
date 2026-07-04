import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, AlertTriangle, Info } from "lucide-react";

/* ============================================================
 * AI SPARK ICON — universal AI identifier (18px deep-blue circle, light dot)
 * ============================================================ */
export function DSAISpark({ className, size = 18 }: { className?: string; size?: number }) {
  const dot = Math.round((size * 7) / 18); // 7px dot when size=18
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full flex-shrink-0 bg-[#0040CC]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        className="rounded-full bg-[#E6F4FA]"
        style={{ width: dot, height: dot }}
      />
    </span>
  );
}

/* ============================================================
 * AI SECTION LABEL — sits next to spark icon
 * ============================================================ */
export function DSAILabel({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C]",
        className
      )}
      {...rest}
    />
  );
}

/* ============================================================
 * AI INFO CARD — neutral output, summaries, analysis
 * ============================================================ */
export function DSAIInfoCard({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] p-[14px]",
        className
      )}
      {...rest}
    />
  );
}

/* ============================================================
 * AI WARNING CARD — AI detected a problem requiring attention
 * ============================================================ */
export function DSAIWarningCard({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[#FAEEDA] border-[0.5px] border-[#EF9F27] rounded-[12px] p-[10px]",
        className
      )}
      {...rest}
    >
      <div className="text-[11px] text-[#412402] leading-[1.5]">{children}</div>
    </div>
  );
}

/* ============================================================
 * AI BADGE — inline pill
 * ============================================================ */
export function DSAIBadge({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center bg-[#EEEDFE] text-[#26215C] border-[0.5px] border-[#AFA9EC] rounded-full text-[10px] font-medium px-[8px] py-px",
        className
      )}
      {...rest}
    />
  );
}

/* ============================================================
 * AI CONFIDENCE BAR — per table row
 * ============================================================ */
export function DSConfBar({ score, className }: { score: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const fill = pct >= 80 ? "bg-[#1D9E75]" : pct >= 50 ? "bg-[#EF9F27]" : "bg-[#E24B4A]";
  const text = pct >= 80 ? "text-[#0F6E56]" : pct >= 50 ? "text-[#633806]" : "text-[#791F1F]";
  return (
    <div className={cn("flex items-center gap-[5px]", className)}>
      <div className="w-[48px] h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className={cn("h-full", fill)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-[11px] font-medium w-[28px] text-right tabular-nums", text)}>
        {pct}%
      </span>
    </div>
  );
}

/* ============================================================
 * AI COLLAPSIBLE PANEL
 * ============================================================ */
export interface DSAICheck {
  status: "ok" | "warn" | "info";
  title: string;
  detail: string;
}

interface DSAIPanelProps {
  /** One-line summary in the header (must reference specific entities) */
  summary: React.ReactNode;
  checks: DSAICheck[];
  defaultOpen?: boolean;
  className?: string;
  /** Optional override for the toggle label (default: "Visa detaljer" / "Dölj") */
  toggleLabelClosed?: string;
  toggleLabelOpen?: string;
}

export function DSAIPanel({
  summary,
  checks,
  defaultOpen = false,
  className,
  toggleLabelClosed = "Visa detaljer",
  toggleLabelOpen = "Dölj",
}: DSAIPanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={cn("overflow-hidden", className)}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-[#EFF6FF] border-b-[0.5px] border-[#B5D4F4] px-[16px] py-[8px] flex items-center gap-[8px] cursor-pointer text-left"
      >
        <DSAISpark />
        <span className="text-[11px] text-[#185FA5] flex-1">{summary}</span>
        <span className="text-[10px] font-medium text-[#185FA5] ml-auto flex items-center gap-[4px]">
          {open ? toggleLabelOpen : toggleLabelClosed}
          <ChevronDown
            size={12}
            strokeWidth={1.8}
            className="transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </span>
      </button>

      {/* Body — expanded */}
      {open && (
        <div className="bg-[#F5FAFF] p-[12px] grid grid-cols-3 gap-[8px]">
          {checks.map((c, i) => (
            <DSAICheckItem key={i} check={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * AI CHECK ITEM (inside panel)
 * ============================================================ */
export function DSAICheckItem({ check }: { check: DSAICheck }) {
  const Icon = check.status === "ok" ? Check : check.status === "warn" ? AlertTriangle : Info;
  const dot =
    check.status === "ok"
      ? "bg-[#E1F5EE] text-[#0F6E56]"
      : check.status === "warn"
      ? "bg-[#FAEEDA] text-[#633806]"
      : "bg-[#E6F1FB] text-[#185FA5]";
  return (
    <div className="bg-white border-[0.5px] border-[#B5D4F4] rounded-[8px] p-[10px]">
      <div className="flex items-start gap-[6px]">
        <span
          className={cn(
            "w-[16px] h-[16px] rounded-full flex items-center justify-center flex-shrink-0 mt-[1px]",
            dot
          )}
        >
          <Icon size={10} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-[#0F172A] leading-tight">{check.title}</div>
          <div className="text-[10px] text-[#475569] mt-[3px] leading-[1.5]">{check.detail}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * AI INLINE ROW EXPANSION (under a table row)
 * ============================================================ */
interface DSAIRowExpansionProps {
  title: React.ReactNode;
  checks: { ok: boolean; label: React.ReactNode }[];
  className?: string;
}
export function DSAIRowExpansion({ title, checks, className }: DSAIRowExpansionProps) {
  return (
    <div
      className={cn(
        "bg-[#F8FAFB] border-b-[0.5px] border-[#E2E8F0] px-[14px] py-[10px] pl-[46px]",
        className
      )}
    >
      <div className="flex items-center gap-[6px] mb-[6px]">
        <DSAISpark size={14} />
        <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#0C447C]">
          {title}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-[4px]">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-[5px] text-[11px] text-[#475569]">
            <span
              className={cn(
                "text-[12px]",
                c.ok ? "text-[#1D9E75]" : "text-[#E24B4A]"
              )}
            >
              {c.ok ? "✓" : "✗"}
            </span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * AI CFO SUMMARY (in reports, RR/BR pages)
 * ============================================================ */
interface DSAICFOSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Defaults to "AI CFO" */
  label?: React.ReactNode;
}
export function DSAICFOSummary({ className, label = "AI CFO", children, ...rest }: DSAICFOSummaryProps) {
  return (
    <div
      className={cn(
        "bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] p-[14px] mb-[12px]",
        className
      )}
      {...rest}
    >
      <div className="flex items-center gap-[6px]">
        <DSAISpark />
        <DSAILabel>{label}</DSAILabel>
      </div>
      <div className="text-[12px] text-[#185FA5] leading-[1.6] mt-[6px]">{children}</div>
    </div>
  );
}
