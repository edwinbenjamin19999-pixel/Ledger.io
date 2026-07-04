import * as React from "react";
import { cn } from "@/lib/utils";

/* ============================================================
 * BASE FIELD STYLES (text/number/date/email/tel/search)
 * ============================================================ */
const fieldBase =
  "w-full bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] px-[10px] h-[36px] " +
  "text-[12px] text-[#0F172A] font-[inherit] placeholder:text-[#94A3B8] " +
  "focus:outline-none focus:border-[#0040CC] focus:ring-2 focus:ring-[#0040CC]/10 transition-colors " +
  "disabled:bg-[#F8FAFB] disabled:text-[#94A3B8] disabled:cursor-not-allowed " +
  "read-only:bg-[#F8FAFB] read-only:text-[#94A3B8] read-only:cursor-not-allowed";

const errorClasses = "border-[#E24B4A] focus:border-[#E24B4A] focus:ring-[#E24B4A]/10";

interface DSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
export const DSInput = React.forwardRef<HTMLInputElement, DSInputProps>(
  ({ className, error, ...rest }, ref) => (
    <input ref={ref} className={cn(fieldBase, error && errorClasses, className)} {...rest} />
  )
);
DSInput.displayName = "DSInput";

interface DSSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}
export const DSSelect = React.forwardRef<HTMLSelectElement, DSSelectProps>(
  ({ className, error, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(fieldBase, "cursor-pointer appearance-none pr-[28px]", error && errorClasses, className)}
      {...rest}
    />
  )
);
DSSelect.displayName = "DSSelect";

interface DSTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}
export const DSTextarea = React.forwardRef<HTMLTextAreaElement, DSTextareaProps>(
  ({ className, error, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "h-auto min-h-[72px] py-[8px] resize-y", error && errorClasses, className)}
      {...rest}
    />
  )
);
DSTextarea.displayName = "DSTextarea";

/* ============================================================
 * LABEL / ERROR / ROW / SECTION
 * ============================================================ */
export function DSFieldLabel({ className, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-[10px] font-medium uppercase tracking-[0.05em] text-[#94A3B8] mb-[4px]",
        className
      )}
      {...rest}
    />
  );
}

export function DSFieldError({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[11px] text-[#E24B4A] mt-[4px]", className)} {...rest} />;
}

export function DSFieldRow({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex gap-[12px] mb-[12px] items-start", className)} {...rest} />;
}

export function DSFormDivider({ className, ...rest }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("border-0 border-t-[0.5px] border-[#E2E8F0] my-[16px]", className)} {...rest} />;
}

export function DSFormSectionTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.06em] text-[#94A3B8] mb-[8px]",
        className
      )}
      {...rest}
    />
  );
}

/* ============================================================
 * FORM CARD
 * ============================================================ */
export function DSFormCard({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden",
        className
      )}
      {...rest}
    />
  );
}

interface DSFormCardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}
export function DSFormCardHeader({ className, title, subtitle, children, ...rest }: DSFormCardHeaderProps) {
  return (
    <div
      className={cn("px-[16px] py-[10px] border-b-[0.5px] border-[#E2E8F0]", className)}
      {...rest}
    >
      {title !== undefined ? (
        <>
          <div className="text-[12px] font-medium text-[#0F172A]">{title}</div>
          {subtitle !== undefined && (
            <div className="text-[11px] text-[#94A3B8] mt-[1px]">{subtitle}</div>
          )}
        </>
      ) : (
        children
      )}
    </div>
  );
}

export function DSFormCardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-[16px]", className)} {...rest} />;
}

/* ============================================================
 * JOURNAL-ENTRY INLINE INPUT (table cells)
 * ============================================================ */
const journalBase =
  "bg-transparent border-[0.5px] border-transparent rounded-[4px] px-[6px] py-[5px] text-[12px] " +
  "focus:outline-none focus:border-[#0040CC] focus:bg-white focus:ring-1 focus:ring-[#0040CC]/10 transition-colors";

interface DSJournalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  amount?: boolean;
}
export const DSJournalInput = React.forwardRef<HTMLInputElement, DSJournalInputProps>(
  ({ className, amount, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(journalBase, "w-full", amount && "text-right tabular-nums", className)}
      {...rest}
    />
  )
);
DSJournalInput.displayName = "DSJournalInput";

export const DSJournalSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...rest }, ref) => (
    <select ref={ref} className={cn(journalBase, "w-full cursor-pointer appearance-none", className)} {...rest} />
  )
);
DSJournalSelect.displayName = "DSJournalSelect";

/* ============================================================
 * ADD-LINE BUTTON
 * ============================================================ */
export const DSAddLineButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "text-[12px] text-[#0040CC] cursor-pointer hover:underline bg-transparent border-0 p-0 shadow-none",
        className
      )}
      {...rest}
    />
  )
);
DSAddLineButton.displayName = "DSAddLineButton";

/* ============================================================
 * BALANCE INDICATOR
 * ============================================================ */
interface DSBalanceProps extends React.HTMLAttributes<HTMLSpanElement> {
  balanced: boolean;
}
export function DSBalance({ balanced, className, ...rest }: DSBalanceProps) {
  return (
    <span
      className={cn(
        "text-[12px] font-medium",
        balanced ? "text-[#1D9E75]" : "text-[#E24B4A]",
        className
      )}
      {...rest}
    />
  );
}

/* ============================================================
 * INTERNAL NOTE CARD (textarea card)
 * ============================================================ */
export function DSNoteCard({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden",
        className
      )}
      {...rest}
    />
  );
}

export const DSNoteTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full border-0 focus:ring-0 focus:outline-none bg-transparent resize-y min-h-[60px] " +
          "text-[12px] text-[#475569] p-[12px] placeholder:text-[#94A3B8]",
        className
      )}
      {...rest}
    />
  )
);
DSNoteTextarea.displayName = "DSNoteTextarea";
