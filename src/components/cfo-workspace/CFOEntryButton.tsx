import { Button } from "@/components/ui/button";
import { BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { encodeCFOContext, type CFOContextPayload } from "@/hooks/useCFOContext";
import { cn } from "@/lib/utils";

interface Props {
  context: CFOContextPayload;
  label?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm";
  className?: string;
}

export const CFOEntryButton = ({ context, label = "Diskutera med AI CFO", variant = "outline", size = "sm", className }: Props) => {
  const navigate = useNavigate();
  const onClick = () => {
    const encoded = encodeCFOContext(context);
    navigate(`/cfo/workspace?context=${encoded}`);
  };
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      className={cn(
        "gap-2 border-[#C8DDF5] hover:border-[#0052FF] bg-white",
        "hover:from-[#0052FF]/15 hover:to-purple-500/15 text-[#0052FF] dark:text-[#0052FF]",
        className,
      )}
    >
      <BrainCircuit className="h-4 w-4" />
      {label}
    </Button>
  );
};
