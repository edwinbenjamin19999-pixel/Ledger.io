const steps = [
  { n: "01", title: "Sätt upp ditt varumärke", desc: "Logga, färger och domän. Live på dagar — inte månader." },
  { n: "02", title: "Bjud in klienter", desc: "Skicka inbjudan. Klienterna onboardas under ditt varumärke." },
  { n: "03", title: "Anslut data", desc: "Bank, Skatteverket, lönesystem. Flödar in automatiskt." },
  { n: "04", title: "AI sköter arbetet", desc: "Bokföring, moms och rapporter. Du fokuserar på rådgivning." },
];

export const WLHowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-[#0F1B2D] py-24 md:py-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-16">
          <p className="text-[#3b82f6] text-xs font-medium tracking-[0.25em] uppercase mb-3">
            Så fungerar det
          </p>
          <h2
            className="text-4xl md:text-5xl font-[700] text-white leading-[1.05]"
            style={{ letterSpacing: "-0.8px" }}
          >
            Från noll till lansering på dagar.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-3 left-12 right-0 h-px bg-gradient-to-r from-[#3b82f6]/30 to-transparent" />
              )}
              <div className="text-[#3b82f6] font-mono text-xs tracking-wider mb-4">{s.n}</div>
              <h3 className="text-white font-semibold mb-2 text-[15px]">{s.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
