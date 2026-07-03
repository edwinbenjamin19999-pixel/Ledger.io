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
        "gap-2 border-[#C8DDF5] hover:border-[#3b82f6] bg-[#0F1F3D]",
        "hover:from-[#3b82f6]/15 hover:to-purple-500/15 text-[#3b82f6] dark:text-[#3b82f6]",
        className,
      )}
    >
      <BrainCircuit className="h-4 w-4" />
      {label}
    </Button>
  );
};
