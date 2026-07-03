/**
 * EmptyState — terminal empty cases ONLY.
 *
 * Use this for genuinely empty terminal states:
 * - A search returned 0 results
 * - A filter excluded all rows
 * - A list within an already-active module that simply has no items right now
 *
 * DO NOT use this when a module has activation potential (connect bank, enable
 * automation, upload first document, etc.). For those cases, use
 * `<ActivationHero />` from `src/components/shared/ActivationHero.tsx` — it
 * structurally enforces a value proposition and a primary action (Law 2 + Law 5).
 *
 * See mem://style/product-experience-laws-sv
 */

import { LucideIcon, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps { icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon = FileQuestion,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) { return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 mb-4">
        <Icon className="h-12 w-12 text-slate-300 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-medium text-slate-500 dark:text-slate-400 mt-4 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction} className="cursor-pointer rounded-xl">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
