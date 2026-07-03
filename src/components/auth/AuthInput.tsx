import * as React from "react";
import { cn } from "@/lib/utils";

export interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Larger height variant for onboarding hero inputs */
  inputSize?: "default" | "lg";
}

/**
 * Premium auth input — matches landing CTA visual standard.
 * h-[52px] default, h-[56px] for lg. rounded-xl, soft border, cyan focus ring.
 */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, inputSize = "default", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-4 bg-white text-[#0f1f35] text-[15px]",
          "border border-slate-200 rounded-xl",
          "placeholder:text-slate-400",
          "focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-150",
          inputSize === "lg" ? "h-[56px] text-base" : "h-[52px]",
          className,
        )}
        {...props}
      />
    );
  },
);
AuthInput.displayName = "AuthInput";
