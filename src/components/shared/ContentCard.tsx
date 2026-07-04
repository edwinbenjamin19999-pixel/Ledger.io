/**
 * Tier 2 — CONTENT CARD
 * Main content panels: data tables, forms, lists.
 * White bg with colored top accent bar.
 */
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  accentColor?: string;       // e.g. 'border-[#3b82f6]'
  iconBgClass?: string;       // e.g. 'bg-[#EFF6FF] text-[#3b82f6]'
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ContentCard({
  title, subtitle, icon: Icon, accentColor = 'border-slate-300',
  iconBgClass = 'bg-slate-50 text-slate-600',
  actions, children, className, noPadding,
}: ContentCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/60',
      'shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden',
      className
    )}>
      {/* Top accent bar */}
      <div className={cn('h-[3px]', accentColor.replace('border-', 'bg-'))} />

      {/* Header row */}
      {title && (
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn('rounded-xl p-2', iconBgClass, 'dark:bg-opacity-20')}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}
