/**
 * Section 6 & 12 — Button with built-in loading state.
 * Prevents double-submission and shows a spinner during async actions.
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LoadingButtonProps extends ButtonProps { loading?: boolean;
  comingSoon?: boolean;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, comingSoon, disabled, children, ...props }, ref) => { if (comingSoon) { return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button ref={ref} disabled {...props} className={`cursor-not-allowed ${props.className || ''}`}>
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kommer snart</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        {...props}
        className={`cursor-pointer ${props.className || ''}`}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
