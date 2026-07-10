/**
 * Card.Alert — Semantic alert card for opportunities, risks, info, and warnings.
 * Part of the Cogniq design system. Use instead of ad-hoc colored containers.
 */
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
  opportunity: {
    bg: 'bg-[#F0FAF6] dark:from-emerald-950/20 dark:to-green-950/10',
    border: 'border-emerald-200/50 dark:border-emerald-800/30',
    accent: 'bg-emerald-500',
    iconBg: 'bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]',
    title: 'text-[#085041] dark:text-emerald-300',
  },
  risk: {
    bg: 'bg-[#FEF4F4] dark:from-rose-950/20 dark:to-red-950/10',
    border: 'border-rose-200/50 dark:border-rose-800/30',
    accent: 'bg-rose-500',
    iconBg: 'bg-[#FCE8E8] text-[#7A1A1A] dark:bg-rose-900/30 dark:text-[#C73838]',
    title: 'text-[#7A1A1A] dark:text-rose-300',
  },
  info: {
    bg: 'bg-[#F5F9FF] dark:from-blue-950/20 dark:to-blue-950/10',
    border: 'border-blue-200/50 dark:border-[#0052FF]/30',
    accent: 'bg-[#0052FF]',
    iconBg: 'bg-[#EFF6FF] text-[#0052FF] dark:bg-blue-900/30 dark:text-[#1E3A5F]',
    title: 'text-[#0052FF] dark:text-[#0052FF]',
  },
  warning: {
    bg: 'bg-[#FEFAF2] dark:from-amber-950/20 dark:to-orange-950/10',
    border: 'border-amber-200/50 dark:border-amber-800/30',
    accent: 'bg-amber-500',
    iconBg: 'bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-[#C28A2B]',
    title: 'text-[#7A5417] dark:text-amber-300',
  },
} as const;

export type AlertTone = keyof typeof TONE_STYLES;

interface AlertCardProps {
  tone: AlertTone;
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function AlertCard({ tone, title, icon: Icon, children, className }: AlertCardProps) {
  const s = TONE_STYLES[tone];

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      'shadow-sm hover:shadow-md transition-shadow duration-200',
      s.bg, s.border,
      className,
    )}>
      {/* Left accent bar */}
      <div className="flex">
        <div className={cn('w-1 shrink-0', s.accent)} />
        <div className="flex-1 p-5">
          {title && (
            <div className="flex items-center gap-2 mb-3">
              {Icon && (
                <div className={cn('rounded-lg p-1.5', s.iconBg)}>
                  <Icon className="w-4 h-4" />
                </div>
              )}
              <h4 className={cn('font-semibold text-sm', s.title)}>{title}</h4>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
