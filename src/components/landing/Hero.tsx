import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useWaitlistCount } from "@/hooks/useWaitlistCount";

export const Hero = () => {
  const navigate = useNavigate();
  const { count } = useWaitlistCount();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    }
  };
  const scrollToHowItWorks = () => scrollToId("how-it-works");
  const scrollToSignup = () => scrollToId("signup");

  return (
    <section
      id="hero-section"
      className="relative w-full bg-transparent overflow-hidden"
      style={{ minHeight: "100vh" }}
    >
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full opacity-60"
          style={{ background: "radial-gradient(ellipse at center, rgba(29,217,240,0.10) 0%, transparent 60%)" }}
        />
      </div>

      <div
        className="relative mx-auto"
        style={{ maxWidth: 960, padding: "100px 24px 60px" }}
      >
        {/* Badge */}
        <div className="flex justify-center hero-anim hero-anim-badge">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-transparent border border-white/20 text-white/60"
            style={{
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ✦ AI som kärna — inte som ett lager
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-center text-white hero-anim hero-anim-headline"
          style={{
            marginTop: 16,
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Ekonomin på autopilot.
        </h1>

        {/* Subheadline */}
        <p
          className="hero-anim hero-anim-sub"
          style={{
            marginTop: 20,
            fontSize: 18,
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.6,
            maxWidth: 580,
            marginLeft: "auto",
            marginRight: "auto",
            textAlign: "center",
          }}
        >
          Det enda ekonomisystemet där AI inte är ett tillägg — det är motorn. Bokföring, moms, budget, prognos och rapportering i ett system som tänker själv.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center hero-anim hero-anim-cta"
          style={{ gap: 12, marginTop: 32 }}
        >
          <button
            onClick={scrollToHowItWorks}
            className="hero-cta-primary bg-white text-[#050d1a] font-semibold hover:bg-white/90"
            style={{
              fontSize: 16,
              padding: "14px 28px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              transition: "all 180ms ease",
            }}
          >
            Se hur det fungerar ↓
          </button>
          <button
            onClick={scrollToSignup}
            className="hero-cta-secondary bg-transparent border border-white/30 text-white hover:border-white/60 hover:bg-white/5"
            style={{
              fontSize: 15,
              fontWeight: 500,
              padding: "14px 22px",
              borderRadius: 10,
              cursor: "pointer",
              transition: "all 180ms ease",
            }}
          >
            Säkra din plats →
          </button>
        </div>

        {/* Social proof block */}
        <div
          className="hero-anim hero-anim-cta"
          style={{
            marginTop: 28,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Waitlist status — honest, no fabricated avatars */}
          <div className="flex flex-wrap items-center justify-center" style={{ gap: 8 }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 400 }} className="text-center">
              <span
                aria-hidden
                className="hero-live-dot"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginRight: 8,
                }}
              />
              {count.toLocaleString("sv-SE")} anmälda · 14 aktiva pilotkunder · Lansering Q3 2026
            </span>
          </div>

          {/* Capability line — honest product capability, no fabricated metrics */}
          <div
            className="text-white/40"
            style={{
              fontSize: 13,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              textAlign: "center",
              margin: "28px auto 0",
              maxWidth: 600,
            }}
          >
            Bokföring · Moms · Löner · Budget · Prognos · Rapportering · Revision · API
          </div>
        </div>

        {/* Video mockup */}
        <div
          className="relative hero-anim hero-anim-video"
          style={{ maxWidth: 820, margin: "56px auto 0" }}
        >
          {/* Glow */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 60%, rgba(29,217,240,0.18) 0%, transparent 70%)",
              transform: "scale(1.15)",
              zIndex: -1,
              filter: "blur(20px)",
            }}
          />
          <div
            className="hero-mockup"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(29,217,240,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center"
              style={{
                height: 36,
                background: "rgba(255,255,255,0.05)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "0 14px",
                gap: 6,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28CA41", display: "inline-block" }} />
              <div
                className="hero-urlbar flex items-center"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  height: 20,
                  maxWidth: 260,
                  flexGrow: 1,
                  marginLeft: 10,
                  padding: "0 10px",
                }}
              >
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  app.ledger.io
                </span>
              </div>
            </div>

            {/* Branded placeholder behind the video so the frame is never
                an empty black box while /hero-demo.mp4 buffers on slow links */}
            <div
              aria-hidden
              className="hero-mockup-fallback"
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 10",
                background:
                  "linear-gradient(135deg, #0e2036 0%, #0a1830 55%, #071322 100%)",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                  maskImage:
                    "radial-gradient(ellipse at 50% 45%, #000 0%, transparent 75%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse at 50% 45%, #000 0%, transparent 75%)",
                }}
              />
              <video
                autoPlay
                loop
                muted
                playsInline
                poster="/hero-demo-poster.jpg"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              >
                <source src="/hero-demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="flex justify-center"
          style={{ marginTop: 32, opacity: 0.4 }}
        >
          <button
            onClick={scrollToHowItWorks}
            aria-label="Scrolla ned"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "white" }}
          >
            <ChevronDown size={20} className="hero-chevron" />
          </button>
        </div>
      </div>

      {/* Section transition fade */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 80,
          background: "linear-gradient(to bottom, transparent, #0f1f35)",
        }}
      />

      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeUpLg {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDown {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50%      { transform: translateY(6px); opacity: 1; }
        }
        .hero-anim { opacity: 0; animation-fill-mode: forwards; animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-badle, .hero-anim-badge    { animation: heroFadeUp 400ms 0ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-headline { animation: heroFadeUp 400ms 80ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-sub      { animation: heroFadeUp 400ms 160ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-cta      { animation: heroFadeUp 400ms 240ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-anim-video    { animation: heroFadeUpLg 600ms 360ms forwards cubic-bezier(0.16,1,0.3,1); }
        .hero-chevron       { animation: pulseDown 1.5s ease infinite; }
        @keyframes heroLogoScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .hero-logo-track { animation: heroLogoScroll 30s linear infinite; }
        @keyframes heroLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.3); }
        }
        .hero-live-dot { animation: heroLivePulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-logo-track { animation: none; }
        }
        .hero-cta-primary:hover   { filter: brightness(1.08); transform: scale(1.02); }
        .hero-cta-secondary:hover { color: white !important; }
        @media (max-width: 640px) {
          .hero-mockup  { border-radius: 12px !important; }
          .hero-urlbar span { display: none; }
        }
      `}</style>
    </section>
  );
};
