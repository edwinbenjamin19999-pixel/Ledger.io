import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FinalCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="bg-[#0F1B2D] py-24 md:py-32 border-t border-white/5">
      <div className="container mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight leading-tight">
          Redo att lämna det manuella bakom dig?
        </h2>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="h-12 px-8 bg-white hover:bg-white/90 text-[#0F1B2D] font-semibold rounded-lg group"
          >
            Kom igång
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => (window.location.href = "mailto:kontakt@bokfy.se")}
            className="h-12 px-8 text-white/80 hover:text-white hover:bg-white/5 rounded-lg"
          >
            Kontakta oss
          </Button>
        </div>
      </div>
    </section>
  );
};
