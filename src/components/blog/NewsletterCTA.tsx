import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NewsletterCTA = () => (
  <section className="py-16">
    <div className="container mx-auto max-w-4xl px-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#0f1f35] to-[#3b82f6] p-10 md:p-14 text-center text-white shadow-[0_30px_80px_rgba(8,145,178,0.25)]">
        <Mail className="w-8 h-8 mx-auto text-[#3b82f6]" />
        <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">Få nya insikter om AI och bokföring</h2>
        <p className="mt-3 text-white/70 max-w-lg mx-auto">
          En kort månadssammanfattning från NorthLedger — produktnyheter, guider och perspektiv. Ingen spam.
        </p>
        <form
          className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement)?.value;
            if (email) window.location.href = `mailto:nyhetsbrev@northledger.se?subject=Prenumerera&body=${encodeURIComponent(email)}`;
          }}
        >
          <input
            name="email"
            type="email"
            required
            placeholder="din@epost.se"
            className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:border-[#3b82f6]"
          />
          <Button type="submit" className="bg-[#3b82f6] text-[#0a1428] hover:bg-[#3b82f6] font-semibold">
            Prenumerera
          </Button>
        </form>
      </div>
    </div>
  </section>
);
