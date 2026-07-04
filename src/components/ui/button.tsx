import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * MINIMALIST MODERN: primär = signaturgradienten (#0052FF→#4D7CFF) med
 * accent-tintad skugga, lyft på hover (-translate-y-0.5) och taktil
 * active-scale. Sekundär/outline = lugna ytor som får kant + skugga vid hover.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  { variants: { variant: { default: "bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] text-white font-semibold shadow-sm hover:shadow-accent-lg hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground font-semibold shadow-sm hover:bg-destructive/90 hover:-translate-y-0.5 active:scale-[0.98]",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted hover:border-[#0052FF]/30 hover:shadow-sm",
        secondary: "bg-muted text-foreground font-semibold hover:bg-muted/70 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        chip: "rounded-full bg-[#0052FF]/5 border border-[#0052FF]/20 text-primary text-xs font-semibold hover:bg-[#0052FF]/10 transition-colors duration-200",
        hero: "bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] text-white font-bold text-base shadow-accent hover:shadow-accent-lg hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]",
        glass: "bg-white/10 border border-white/25 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/40",
      },
      size: { default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => { const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
