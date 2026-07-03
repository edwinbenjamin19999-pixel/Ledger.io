import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTA = () => { return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-10" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-card border border-border rounded-2xl p-12 shadow-[var(--shadow-soft)]">
          <h2 className="text-4xl md:text-5xl font-bold">
            Redo att komma igång?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Beta-versionen är live! Börja migrera från Fortnox på 5 minuter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button variant="hero" size="lg" className="text-lg px-8 group" onClick={() => window.location.href = '/auth'}>
              Logga in
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 border-[#C8DDF5] text-[#3b82f6] hover:bg-[#EFF6FF] hover:shadow-[0_0_12px_rgba(6,182,212,0.12)] hover:scale-[1.02] transition-all duration-200" onClick={() => window.location.href = 'mailto:kontakt@bokfy.se'}>
              Boka demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            Lansering snart • Kontakta oss för tidig åtkomst
          </p>
        </div>
      </div>
    </section>
  );
};
