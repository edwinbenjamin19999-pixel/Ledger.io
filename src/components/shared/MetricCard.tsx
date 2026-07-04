/**
 * Tier 1 — METRIC CARD
 * Solid colored background, white text, for single metrics/KPIs in module pages.
 */
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subLabel?: string;
  icon?: LucideIcon;
  solidClass: string; // e.g. 'bg-[#3b82f6]'
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function MetricCard({ label, value, subLabel, icon: Icon, solidClass, trend, className }: MetricCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-5 shadow-lg dark:shadow-black/30',
      solidClass,
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <span className="text-white/70 text-xs font-medium uppercase tracking-widest">
            {label}
          </span>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
            {value}
          </div>
          {subLabel && (
            <span className="text-white/60 text-xs">{subLabel}</span>
          )}
        </div>
        {Icon && (
          <Icon className="w-5 h-5 text-white/20 flex-shrink-0" />
        )}
      </div>

      {trend && (
        <>
          <div className="mt-3 border-t border-white/10" />
          <div className="mt-2">
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              trend.positive
                ? 'bg-white/15 text-white'
                : 'bg-red-400/30 text-white'
            )}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          </div>
        </>
      )}

      {/* Decorative circle */}
      <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5" />
    </div>
  );
}
