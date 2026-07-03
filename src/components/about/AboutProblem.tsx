import { X } from "lucide-react";

const problems = [
  { title: "Manuellt arbete", desc: "Varje kvitto, faktura och konto bokas för hand – timmar av repetitivt arbete varje månad." },
  { title: "Splittrade verktyg", desc: "Bokföring, bank, lön och moms ligger i olika system som aldrig pratar med varandra." },
  { title: "Hög felrisk", desc: "Manuella konteringar leder till felaktiga rapporter, missade momsavdrag och dyra korrigeringar." },
  { title: "Långsam rapportering", desc: "Rapporter kommer veckor efter månadens slut – när besluten redan borde vara fattade." },
];

export const AboutProblem = () => (
  <section className="bg-[#0f1f35] py-24 md:py-32">
    <div className="container mx-auto max-w-5xl px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
          Bokföring idag är <span className="text-white/40">trasig.</span>
        </h2>
        <p className="mt-5 text-[15px] text-white/55 leading-relaxed">
          Traditionella system är byggda för hur bokföring gjordes på 90-talet. Resultatet syns varje månad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {problems.map((p) => (
          <div key={p.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-7">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px]">{p.title}</h3>
                <p className="mt-1.5 text-[14px] text-white/55 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
