import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComingSoonBadgeProps {
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ComingSoonBadge({ label = 'Kommande funktion', size = 'sm', className }: ComingSoonBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      'bg-[#FAEEDA] text-[#7A5417] border border-[#F0DDB7]',
      className
    )}>
      <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label}
    </span>
  );
}
