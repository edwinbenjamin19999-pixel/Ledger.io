import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const points = [
  { title: "Din branding", desc: "Logotyp, färger, domän — helt ditt." },
  { title: "Ditt klientgränssnitt", desc: "Dina kunder ser aldrig Bokfy." },
  { title: "Samma motor", desc: "Full kraft av Bokfy under huven." },
];

export const WhiteLabelSection = () => {
  const navigate = useNavigate();
  return (
    <section className="section-shell">
      <div className="section-inner">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left side */}
          <div className="lg:col-span-5">
            <p className="section-label">White Label</p>
            <h2 className="section-headline text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              Lansera din egen bokföringsplattform.
            </h2>
            <p className="section-lede text-base leading-relaxed">
              Erbjud Bokfy under ditt varumärke. För redovisningsbyråer, banker och rådgivare.
            </p>

            {/* Feature list */}
            <ul className="mt-8 space-y-4">
              {points.map((p) => (
                <li key={p.title} className="flex gap-3 items-start">
                  <div
                    className="flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "rgba(37,99,235,0.12)",
                      border: "1px solid rgba(37,99,235,0.3)",
                    }}
                  >
                    <Check className="w-3 h-3" style={{ color: "#3b82f6" }} strokeWidth={3} />
                  </div>
                  <div>
                    <div className="text-white font-medium text-[15px]">{p.title}</div>
                    <div className="text-white/55 text-[13px] mt-0.5">{p.desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate("/white-label")}
              className="mt-8 h-11 px-6 bg-white text-[#0F1B2D] hover:bg-white/90 font-medium rounded-lg group"
            >
              Läs mer om White Label
              <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>

          {/* Right side: browser mockup */}
          <div className="lg:col-span-7">
            <div
              className="relative mx-auto"
              style={{
                maxWidth: 540,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow:
                  "0 32px 80px rgba(0,0,0,0.45), 0 0 40px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
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
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28CA41" }} />
                <div
                  className="flex items-center"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 6,
                    height: 20,
                    maxWidth: 220,
                    flexGrow: 1,
                    marginLeft: 10,
                    padding: "0 10px",
                  }}
                >
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                    app.byranab.se
                  </span>
                </div>
              </div>

              {/* Mockup body */}
              <div style={{ background: "#0F1B2D", padding: 24 }}>
                {/* Fake brand header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: "linear-gradient(135deg, #fff, #d4d4d8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0F1B2D",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      B
                    </div>
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 15,
                        letterSpacing: "-0.2px",
                      }}
                    >
                      ByrånAB
                    </span>
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </div>

                {/* Page title */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                    Översikt
                  </div>
                  <div className="text-[14px] text-white font-medium">Mars 2026</div>
                </div>

                {/* KPI cards row */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Omsättning", value: "284k", trend: "+12%" },
                    { label: "Resultat", value: "62k", trend: "+8%" },
                    { label: "Likviditet", value: "418k", trend: "+4%" },
                  ].map((k) => (
                    <div
                      key={k.label}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {k.label}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#fff",
                          marginTop: 4,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {k.value}
                      </div>
                      <div style={{ fontSize: 10, color: "#3b82f6", marginTop: 2 }}>
                        ↗ {k.trend}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tiny faux chart bars */}
                <div
                  className="mt-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div className="flex items-end justify-between" style={{ height: 48, gap: 4 }}>
                    {[30, 45, 38, 55, 48, 62, 58, 72, 68, 80, 75, 88].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          background:
                            "linear-gradient(to top, rgba(59,130,246,0.55), rgba(59,130,246,0.15))",
                          borderRadius: 2,
                        }}
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
