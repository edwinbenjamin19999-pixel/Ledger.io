import * as React from "react";
import { cn } from "@/lib/utils";

export function DSTable({ className, ...rest }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="rounded-ds-card border-0.5 border-[color:var(--ds-border)] overflow-hidden bg-[color:var(--ds-surface)]">
      <table
        className={cn("w-full border-collapse text-left", className)}
        style={{ tableLayout: "fixed" }}
        {...rest}
      />
    </div>
  );
}

export function DSThead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function DSTbody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

interface DSThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sort?: "asc" | "desc" | "none";
  numeric?: boolean;
}

export function DSTh({ sort, numeric, className, children, ...rest }: DSThProps) {
  return (
    <th
      className={cn(
        "px-2.5 py-2 text-[10px] font-medium uppercase tracking-[0.07em] text-[color:var(--ds-text-3)]",
        "border-b-0.5 border-[color:var(--ds-border)] bg-[color:var(--ds-page-bg)] whitespace-nowrap select-none",
        numeric ? "text-right" : "text-left",
        rest.onClick ? "cursor-pointer hover:text-[color:var(--ds-text-1)]" : "",
        className
      )}
      {...rest}
    >
      <span className={cn("inline-flex items-center gap-1", numeric && "justify-end w-full")}>
        {children}
        {sort && (
          <span aria-hidden className="text-[9px] opacity-70">
            {sort === "asc" ? "↑" : sort === "desc" ? "↓" : "↕"}
          </span>
        )}
      </span>
    </th>
  );
}

interface DSTdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  mono?: boolean;
  emphasis?: boolean; // for primary text on amount cells (text-1, weight 500)
}

export function DSTd({ numeric, mono, emphasis, className, children, ...rest }: DSTdProps) {
  return (
    <td
      className={cn(
        "px-2.5 py-[9px] text-[12px] border-b-0.5 border-[color:var(--ds-border-subtle)] align-middle truncate",
        mono ? "font-mono text-[11px] text-[color:var(--ds-text-2)]" : "text-[color:var(--ds-text-2)]",
        numeric && "text-right ds-tabular",
        emphasis && "text-[color:var(--ds-text-1)] font-medium",
        className
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

interface DSTrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  state?: "default" | "selected" | "overdue" | "expanded";
}

export function DSTr({ state = "default", className, ...rest }: DSTrProps) {
  const stateClass = {
    default: "hover:bg-[color:var(--ds-page-bg)]",
    selected: "bg-[#EFF6FF]",
    overdue: "bg-[color:var(--ds-overdue)]",
    expanded: "bg-[color:var(--ds-page-bg)] cursor-default",
  }[state];
  return <tr className={cn(stateClass, className)} {...rest} />;
}
