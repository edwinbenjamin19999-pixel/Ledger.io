import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ComingSoonButtonProps {
  children: React.ReactNode;
  tooltipText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function ComingSoonButton({
  children,
  tooltipText = 'Denna funktion lanseras snart',
  className,
  variant = 'outline',
}: ComingSoonButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            disabled
            className={cn('opacity-60 cursor-not-allowed', className)}
            onClick={e => e.preventDefault()}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-[#7A5417]" />
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
