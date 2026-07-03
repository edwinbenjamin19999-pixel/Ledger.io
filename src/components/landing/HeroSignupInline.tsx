import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const HeroSignupInline = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Ange en giltig e-postadress");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      email: trimmed,
      source: "landing_hero",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info("Du är redan registrerad!");
      else toast.error("Något gick fel. Försök igen.");
    } else {
      toast.success("Du är på listan!");
      setEmail("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
    >
      <input
        type="email"
        required
        placeholder="din@email.se"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ WebkitTextFillColor: "#ffffff", colorScheme: "dark" }}
        className="flex-1 h-12 px-4 bg-white/10 border border-white/20 text-white text-[15px] placeholder:text-white/50 focus:border-[#3b82f6]/60 focus:outline-none rounded-lg"
      />
      <Button
        type="submit"
        disabled={loading}
        className="h-12 px-6 bg-white hover:bg-white/90 text-[#0F1B2D] font-semibold rounded-lg whitespace-nowrap"
      >
        {loading ? "Skickar..." : "Säkra din plats"}
        <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </form>
  );
};
