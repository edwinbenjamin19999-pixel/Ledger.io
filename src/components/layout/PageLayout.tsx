import { ReactNode } from "react";
import { SavedViewChips } from "@/components/financial-os/SavedViewChips";
import { AIInsightBar } from "@/components/financial-os/AIInsightBar";
import { CommentsPanel } from "@/components/financial-os/CommentsPanel";
import { PresentationMode } from "@/components/financial-os/PresentationMode";

interface PageLayoutProps { /** Page title */
  title: string;
  /** Short description under the title */
  subtitle?: string;
  /** Optional action buttons (top-right) */
  actions?: ReactNode;
  /** Company ID (reserved for future use) */
  companyId?: string;
  /** Page content */
  children: ReactNode;
  /** Optional className override */
  className?: string;
  /** When true, mounts Financial OS chrome: SavedViewChips + AIInsightBar
   *  above content and the global CommentsPanel + PresentationMode portals. */
  financialOS?: boolean;
}

/**
 * Unified page layout wrapper.
 * Enforces consistent title, subtitle, and spacing across all pages.
 * AI assistant is provided globally via GlobalAIAssistant in AppLayout.
 */
export const PageLayout = ({ title,
  subtitle,
  actions,
  children,
  className,
  financialOS,
}: PageLayoutProps) => { return (
    <div className={`page-container ${className || ""}`}>
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {financialOS && (
        <div className="space-y-3 mb-2">
          <SavedViewChips />
          <AIInsightBar />
        </div>
      )}
      <div className="space-y-6">{children}</div>
      {financialOS && (
        <>
          <CommentsPanel />
          <PresentationMode />
        </>
      )}
    </div>
  );
};
