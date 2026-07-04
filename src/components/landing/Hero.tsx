import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useWaitlistCount } from "@/hooks/useWaitlistCount";

/**
 * MINIMALIST MONOCHROME HERO — tesen. Vit yta, svart text. Oversized
 * Playfair-rubrik som grafiskt element. Tjock svart regel som skiljetecken.
 * Inga färger, gradienter eller skuggor — endast typografi, linjer och
 * negativ yta. Produktbilden gråskaligt inramad.
 */
export const Hero = () => {
  const navigate = useNavigate();
  const { count } = useWaitlistCount();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section className="relative w-full bg-background pt-[60px]">
      <div className="mx-auto max-w-6xl px-6 md:px-8 lg:px-12">
        {/* Eyebrow */}
        <div className="flex items-center gap-4 pt-20">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-foreground">
            AI som kärna — inte som ett lager
          </span>
          <span aria-hidden className="h-px flex-1 bg-neutral-300" />
          <span className="hidden font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            Est. 2026 · Sverige
          </span>
        </div>

        {/* Oversized display headline — stram grotesk, enhetlig vikt */}
        <h1 className="mt-10 font-display font-semibold leading-[0.95] tracking-[-0.04em] text-foreground text-[clamp(52px,11vw,148px)]">
          Ekonomin på
          <br />
          autopilot
        </h1>

        {/* Thick rule + bordered square (decorative punctuation) */}
        <div className="mt-10 flex items-center gap-4">
          <span aria-hidden className="h-1 w-24 bg-foreground" />
          <span aria-hidden className="h-3 w-3 border-2 border-foreground" />
        </div>

        {/* Lead + CTAs in editorial two-column */}
        <div className="mt-10 grid grid-cols-1 gap-10 border-t border-foreground pt-10 md:grid-cols-12">
          <p className="font-serif text-xl leading-relaxed text-foreground md:col-span-7">
            Det enda ekonomisystemet där AI inte är ett tillägg — det är motorn.
            Bokföring, moms, budget, prognos och rapportering i ett system som
            tänker själv.
          </p>
          <div className="flex flex-col items-start gap-4 md:col-span-5">
            <button
              onClick={() => navigate("/auth")}
              className="group inline-flex h-14 items-center gap-3 border-2 border-foreground bg-foreground px-8 font-mono text-xs uppercase tracking-widest text-background transition-colors duration-100 hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-foreground focus-visible:outline-offset-[3px]"
            >
              Kom igång gratis
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => scrollToId("how-it-works")}
              className="font-mono text-xs uppercase tracking-widest text-foreground underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-foreground focus-visible:outline-offset-2"
            >
              Se hur det fungerar ↓
            </button>
          </div>
        </div>

        {/* Metadata row — mono */}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-neutral-200 pt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <span className="text-foreground">
            {count.toLocaleString("sv-SE")} anmälda
          </span>
          <span aria-hidden>/</span>
          <span>14 aktiva pilotkunder</span>
          <span aria-hidden>/</span>
          <span>Lansering Q3 2026</span>
        </div>
      </div>

      {/* Product mockup — bordered, grayscale, editorial */}
      <div className="mx-auto mt-16 max-w-6xl px-6 md:px-8 lg:px-12">
        <div className="border-2 border-foreground">
          <div className="flex items-center gap-2 border-b-2 border-foreground bg-background px-4 py-2.5">
            <span className="h-2.5 w-2.5 border border-foreground" />
            <span className="h-2.5 w-2.5 border border-foreground" />
            <span className="h-2.5 w-2.5 border border-foreground" />
            <span className="ml-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              app.bokfy.se
            </span>
          </div>
          <div
            className="relative w-full overflow-hidden bg-muted"
            style={{ aspectRatio: "16 / 10" }}
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(#00000010 1px, transparent 1px), linear-gradient(90deg, #00000010 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <video
              autoPlay
              loop
              muted
              playsInline
              poster="/hero-demo-poster.jpg"
              className="absolute inset-0 block h-full w-full object-cover grayscale"
            >
              <source src="/hero-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      {/* Thick section divider */}
      <div aria-hidden className="mx-auto mt-16 h-1 max-w-6xl bg-foreground" />
    </section>
  );
};
