import { ArrowRight } from "lucide-react";

/**
 * MINIMALIST MONOCHROME — inverterat svart emphasis-block (spec: inversion
 * för emphasis istället för accentfärg). Vit text, mono-etikett, skarpa hörn.
 */
export const PilotCTA = () => {
  return (
    <section id="pilot" className="relative overflow-hidden border-y-4 border-foreground bg-foreground py-28 text-background">
      <div className="relative mx-auto max-w-4xl px-6 md:px-8 lg:px-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-background/60">
          Pilotprogram
        </p>
        <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl md:text-6xl font-medium leading-[1.05] tracking-tight text-background">
          Vi söker utvalda pilotföretag att växa med.
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-serif text-lg leading-relaxed text-background/70">
          Ansök om tidig tillgång — begränsat antal platser. Du får full
          onboarding, direktlinje till teamet och påverkar produkten.
        </p>
        <div className="mt-10 flex justify-center">
          <a
            href="mailto:pilot@bokfy.se"
            className="group inline-flex h-14 items-center gap-3 border-2 border-background bg-background px-8 font-mono text-xs uppercase tracking-widest text-foreground transition-colors duration-100 hover:bg-foreground hover:text-background focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-background focus-visible:outline-offset-[3px]"
          >
            Ansök om pilotplats
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
};
