import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps { size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({ size = "md", 
  message,
  fullScreen = false 
}: LoadingSpinnerProps) => { const sizeClasses = { sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const containerClasses = fullScreen
    ? "min-h-screen flex flex-col items-center justify-center"
    : "flex flex-col items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
