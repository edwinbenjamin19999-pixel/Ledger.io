/**
 * Tier 3 — WIDGET CARD
 * Supporting info: charts, activity feeds, quick actions.
 * White bg, no top accent bar.
 */
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetCardProps {
  title?: string;
  icon?: LucideIcon;
  iconBgClass?: string; // e.g. 'bg-[#EFF6FF] text-[#3b82f6]'
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function WidgetCard({
  title, icon: Icon, iconBgClass = 'bg-slate-100 text-slate-600',
  badge, actions, children, className, noPadding,
}: WidgetCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-slate-100 dark:border-slate-700',
      'bg-white dark:bg-slate-800/40 shadow-sm',
      'hover:bg-gradient-to-br hover:from-white hover:to-slate-50/50 dark:hover:from-slate-800/40 dark:hover:to-slate-800/60',
      'transition-all duration-200',
      className
    )}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn('rounded-xl p-2', iconBgClass, 'dark:bg-opacity-20')}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
            {badge}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className={noPadding ? '' : 'px-6 pb-5'}>
        {children}
      </div>
    </div>
  );
}
