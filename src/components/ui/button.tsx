import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  { variants: { variant: { default: "bg-[#0F1F3D] text-white shadow-[0_2px_8px_rgba(6,182,212,0.25)] hover:from-[#3b82f6] hover:to-blue-500 hover:shadow-[0_4px_16px_rgba(6,182,212,0.35)] hover:-translate-y-px active:translate-y-0 transition-all duration-150 font-medium",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md transition-[all,transform] hover:shadow-lg hover:scale-105",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        chip: "rounded-full bg-[#EFF6FF] text-[#3b82f6] border border-cyan-200/50 hover:bg-[#EFF6FF] hover:shadow-[0_0_12px_rgba(6,182,212,0.15)] text-xs font-medium transition-all duration-150",
        hero: "bg-gradient-to-b from-[#0fd4d4] to-[#3b82f6] text-[#0a1428] shadow-[0_2px_8px_rgba(14,206,206,0.3)] hover:from-[#12e0e0] hover:to-[#0fd4d4] hover:shadow-[0_4px_16px_rgba(14,206,206,0.4)] hover:-translate-y-px active:translate-y-0 font-semibold transition-all duration-150",
        glass: "bg-transparent border border-[rgba(255,255,255,0.25)] text-white/90 hover:bg-[rgba(255,255,255,0.08)] hover:text-white hover:shadow-[0_0_16px_rgba(6,182,212,0.1)] transition-all duration-200",
      },
      size: { default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
