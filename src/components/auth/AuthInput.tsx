import * as React from "react";
import { cn } from "@/lib/utils";

export interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Larger height variant for onboarding hero inputs */
  inputSize?: "default" | "lg";
}

/**
 * FLAT AUTH-INPUT — muted yta i vila, vit yta + hård blå kant i fokus.
 * Ingen ring-glow, ingen skugga (flat-systemets fokusprincip).
 */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, inputSize = "default", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-4 bg-gray-100 text-[#0F1B2D] text-[15px]",
          "border-2 border-transparent rounded-md",
          "placeholder:text-[#0F1B2D]/40",
          "focus:outline-none focus:border-[#2563EB] focus:bg-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors duration-200",
          inputSize === "lg" ? "h-[56px] text-base" : "h-[52px]",
          className,
        )}
        {...props}
      />
    );
  },
);
AuthInput.displayName = "AuthInput";
