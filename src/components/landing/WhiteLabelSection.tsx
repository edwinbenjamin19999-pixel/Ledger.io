import { ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * LJUST WHITE LABEL-BLOCK — near-white yta, platta blå check-rutor, mockup i
 * vit ram med mörk produktkropp (branded dashboard-screenshot).
 */
const points = [
  { title: "Din branding", desc: "Logotyp, färger, domän — helt ditt." },
  { title: "Ditt klientgränssnitt", desc: "Dina kunder ser aldrig Cogniq." },
  { title: "Samma motor", desc: "Full kraft av Cogniq under huven." },
];

const KPIS = [
  { label: "Omsättning", value: "284k", trend: "+12%" },
  { label: "Resultat", value: "62k", trend: "+8%" },
  { label: "Likviditet", value: "418k", trend: "+4%" },
];

const BARS = [30, 45, 38, 55, 48, 62, 58, 72, 68, 80, 75, 88];

export const WhiteLabelSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-[#F5F8FF] py-24 px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -left-28 h-[340px] w-[340px] rounded-full bg-[#0052FF]/5"
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Vänster */}
          <div className="lg:col-span-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#0052FF]">
              White Label
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-[#0F172A]">
              Lansera din egen bokföringsplattform.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Erbjud Cogniq under ditt varumärke. För redovisningsbyråer, banker
              och rådgivare.
            </p>

            <ul className="mt-8 space-y-4">
              {points.map((p) => (
                <li key={p.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md bg-[#0052FF]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
                  </span>
                  <div>
                    <div className="text-[15px] font-bold text-[#0F172A]">{p.title}</div>
                    <div className="mt-0.5 text-[13px] text-slate-500">{p.desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate("/white-label")}
              className="group mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-[#0052FF] px-6 text-[15px] font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-[#0040CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F8FF]"
            >
              Läs mer om White Label
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>

          {/* Höger: mockup i vit platt ram */}
          <div className="lg:col-span-7">
            <div className="mx-auto max-w-[540px] overflow-hidden rounded-lg bg-white p-1.5">
              {/* Browser chrome — flat grå list */}
              <div className="flex items-center gap-1.5 rounded-t-md bg-gray-100 px-3.5 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <div className="ml-2 flex h-5 max-w-[220px] flex-grow items-center rounded bg-white px-2.5">
                  <span className="text-[11px] text-gray-400">app.byranab.se</span>
                </div>
              </div>

              {/* Mockup-kropp — mörk produktyta */}
              <div className="rounded-b-md bg-[#0F172A] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-extrabold text-[#0F172A]">
                      B
                    </div>
                    <span className="text-[15px] font-bold tracking-tight text-white">
                      ByrånAB
                    </span>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-white/10" />
                </div>

                <div className="mb-4">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">
                    Översikt
                  </div>
                  <div className="text-[14px] font-semibold text-white">Mars 2026</div>
                </div>

                {/* KPI-rad — platta block med blå topplist */}
                <div className="grid grid-cols-3 gap-2.5">
                  {KPIS.map((k) => (
                    <div
                      key={k.label}
                      className="rounded-md border-t-2 border-[#4D7CFF] bg-white/[0.07] p-3"
                    >
                      <div className="text-[9px] uppercase tracking-wide text-white/50">
                        {k.label}
                      </div>
                      <div className="mt-1 text-lg font-bold text-white tabular-nums">
                        {k.value}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-emerald-300">
                        ↗ {k.trend}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stapeldiagram — solida blå staplar */}
                <div className="mt-4 rounded-md bg-white/[0.05] p-3">
                  <div className="flex h-12 items-end justify-between gap-1">
                    {BARS.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-[#4D7CFF]"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
