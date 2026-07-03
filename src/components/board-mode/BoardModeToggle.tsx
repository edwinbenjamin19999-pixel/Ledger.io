import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBoardModeToggle } from "@/hooks/useBoardModeToggle";
import { cn } from "@/lib/utils";

export const BoardModeToggle = ({ className }: { className?: string }) => {
  const { enabled, toggle } = useBoardModeToggle();
  return (
    <Button
      onClick={toggle}
      className={cn(
        "gap-2 rounded-lg px-5 py-2 text-sm font-medium shadow-none",
        "bg-[#3b82f6] hover:bg-[#26bfac] text-white border-0",
        className
      )}
    >
      <Sparkles className="h-4 w-4" />
      Board Mode
    </Button>
  );
};
