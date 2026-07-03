import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const FloatingBookkeepButton = () => { const navigate = useNavigate();

  return (
    <Button
      onClick={() => navigate("/bookkeep")}
      className="fixed bottom-20 md:bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:scale-105 transition-all duration-200 md:h-auto md:w-auto md:rounded-lg md:px-6 md:py-3"
      size="icon"
    >
      <Sparkles className="h-6 w-6 md:mr-2" />
      <span className="hidden md:inline font-semibold">AI Bokför</span>
    </Button>
  );
};
