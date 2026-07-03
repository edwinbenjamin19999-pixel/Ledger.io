const testimonials = [
  {
    quote:
      "Momsen räknar sig själv nuförtiden. Vi granskade och skickade in på under fem minuter. Det är en helt annan verklighet.",
    name: "Anna L.",
    title: "VD, konsultbolag Stockholm",
    initials: "AL",
  },
  {
    quote:
      "Som redovisningsbyrå hanterar vi fler klienter med samma team. White label-funktionen är exakt vad branschen behövt.",
    name: "Marcus E.",
    title: "Partner, redovisningsbyrå",
    initials: "ME",
  },
  {
    quote:
      "Bokföringen sker i realtid och jag behöver knappt ingripa. Jag använder Bokfy som ett ekonomiverktyg, inte ett bokföringsprogram.",
    name: "Sara J.",
    title: "Grundare, tech-startup",
    initials: "SJ",
  },
  {
    quote:
      "Vi gick från 3 dagars månadsavslut till 4 timmar. Det är inte en förbättring — det är en ny kategori av verktyg.",
    name: "Johan R.",
    title: "CFO, e-handelskoncern",
    initials: "JR",
    highlighted: true,
  },
];

const Stars = () => (
  <div
    className="flex items-center"
    style={{ gap: 2, marginBottom: 16, color: "#3b82f6", fontSize: 14, letterSpacing: 1 }}
    aria-label="5 av 5 stjärnor"
  >
    ★★★★★
  </div>
);

export const Testimonials = () => {
  return (
    <section className="section-shell">
      <div className="section-inner">
        <p className="section-label">Från användarna</p>
        <h2 className="section-headline" style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.5px" }}>
          Vad våra användare säger
        </h2>
        <p className="section-lede text-[15px] leading-relaxed max-w-2xl">
          Riktiga röster från svenska företag, byråer och CFO:er som använder Bokfy dagligen.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="dark-surface-card flex flex-col"
              style={{
                padding: "28px 24px",
                ...(t.highlighted ? { borderLeft: "3px solid #3b82f6" } : {}),
              }}
            >
              <Stars />
              <p
                className="flex-1"
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 15,
                  lineHeight: 1.7,
                  marginBottom: 24,
                }}
              >
                {t.quote}
              </p>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20 }}>
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      padding: 2,
                      background: "linear-gradient(135deg, #3b82f6, rgba(37,99,235,0.3))",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        background: "#0F1B2D",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {t.initials}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                      {t.name}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                      {t.title}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* See more link */}
        <div className="mt-10 text-center">
          <a
            href="/about"
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ color: "#3b82f6", fontSize: 14 }}
          >
            Se fler kundberättelser
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
