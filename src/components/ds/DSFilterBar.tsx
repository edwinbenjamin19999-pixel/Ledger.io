import * as React from "react";
import { cn } from "@/lib/utils";

/* ============================================================
 * FILTER BAR
 * ============================================================ */
export function DSFilterBar({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border-b-[0.5px] border-[#E2E8F0] px-[16px] py-[8px] flex items-center gap-[8px] flex-wrap",
        className
      )}
      {...rest}
    />
  );
}

export function DSFilterLabel({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.05em] text-[#94A3B8] whitespace-nowrap",
        className
      )}
      {...rest}
    />
  );
}

interface DSFilterPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function DSFilterPill({ active, className, ...rest }: DSFilterPillProps) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full text-[11px] transition-colors cursor-pointer",
        active
          ? "px-[10px] py-[3px] bg-[#EFF6FF] text-[#0C447C] border-[0.5px] border-[#85B7EB] font-medium"
          : "px-[10px] py-[3px] bg-white text-[#475569] border-[0.5px] border-[#E2E8F0] hover:bg-[#F8FAFB] hover:text-[#0F172A]",
        className
      )}
      {...rest}
    />
  );
}

/* ============================================================
 * VERTICAL SEPARATOR
 * ============================================================ */
export function DSFilterSeparator({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={cn("w-px h-[18px] bg-[#E2E8F0]", className)}
      {...rest}
    />
  );
}

/* ============================================================
 * PAGE-LEVEL TABS
 * ============================================================ */
export function DSTabBar({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn("border-b-[0.5px] border-[#E2E8F0] flex gap-0", className)}
      {...rest}
    />
  );
}

interface DSTabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function DSTab({ active, className, ...rest }: DSTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "px-[14px] py-[8px] text-[12px] cursor-pointer border-b-2 -mb-px transition-colors",
        active
          ? "text-[#0040CC] font-medium border-[#0040CC]"
          : "text-[#475569] border-transparent hover:text-[#0F172A]",
        className
      )}
      {...rest}
    />
  );
}

/* ============================================================
 * SEARCH FIELD
 * ============================================================ */
export const DSSearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function DSSearchInput({ className, type = "text", ...rest }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] px-[10px] h-[34px] focus:outline-none focus:border-[#0040CC] focus:bg-white focus:ring-2 focus:ring-[#0040CC]/10",
          className
        )}
        {...rest}
      />
    );
  }
);

/* ============================================================
 * DATE RANGE INPUT
 * ============================================================ */
export const DSDateInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function DSDateInput({ className, type = "date", ...rest }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[11px] text-[#0F172A] px-[8px] py-[4px] bg-white font-[inherit] focus:outline-none focus:border-[#0040CC]",
          className
        )}
        {...rest}
      />
    );
  }
);

/* ============================================================
 * COLUMNS BUTTON
 * ============================================================ */
export const DSColumnsButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function DSColumnsButton({ className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "bg-transparent border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[11px] text-[#475569] px-[10px] h-[34px] hover:bg-[#F8FAFB] flex items-center gap-[5px]",
          className
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

/* ============================================================
 * ACTION BAR (selection summary)
 * ============================================================ */
export function DSActionBar({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border-b-[0.5px] border-[#E2E8F0] px-[16px] py-[7px] flex items-center justify-between",
        className
      )}
      {...rest}
    />
  );
}

export function DSActionBarCount({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-[11px] text-[#475569]", className)} {...rest} />;
}

export function DSActionBarAmount({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-[11px] font-medium text-[#0F172A]", className)} {...rest} />;
}

export const DSActionBarButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function DSActionBarButton({ className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "bg-transparent border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[11px] text-[#475569] px-[10px] h-[28px] hover:bg-[#F8FAFB]",
          className
        )}
        {...rest}
      />
    );
  }
);
