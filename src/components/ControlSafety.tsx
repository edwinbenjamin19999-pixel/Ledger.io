import { useState } from "react";
import { ShieldCheck, Eye, FileSearch, Pencil, ChevronDown } from "lucide-react";

const controls = [
  {
    icon: ShieldCheck,
    title: "Du godkänner innan bokföring",
    description: "Aktivera manuellt godkännande när du vill — AI väntar på din signal.",
  },
  {
    icon: Eye,
    title: "AI bokför aldrig utan transparens",
    description: "Varje beslut motiveras med konto, momsregel och referens.",
  },
  {
    icon: FileSearch,
    title: "Alla förändringar loggas",
    description: "Fullständig revisionslogg — vem, vad, när och varför.",
  },
  {
    icon: Pencil,
    title: "Du kan justera allt i efterhand",
    description: "Inget är låst. Korrigera, lägg till eller ta bort när som helst.",
  },
];

export const ControlSafety = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? controls : controls.slice(0, 3);

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-[#0B1D2A] to-[#0F1B2D]">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="text-center mb-12">
          <h2
            className="font-[800] text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1.5px" }}
          >
            Full kontroll —{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent">
              alltid
            </span>
          </h2>
          <p className="text-white/50 text-[15px] max-w-xl mx-auto">
            AI gör jobbet. Du behåller kontrollen — varje beslut kan granskas, motiveras och justeras.
          </p>
        </div>

        {/* Desktop grid */}
        <div className="hidden sm:grid grid-cols-2 gap-4">
          {controls.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-[rgba(37,99,235,0.2)] hover:bg-white/[0.04] transition-colors duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(37,99,235,0.08)] border border-[rgba(37,99,235,0.15)] flex items-center justify-center mb-4">
                <c.icon className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <h3 className="text-[17px] font-semibold text-white mb-1.5">{c.title}</h3>
              <p className="text-[14px] text-white/50 leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile single column with show-more */}
        <div className="sm:hidden space-y-3">
          {visible.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(37,99,235,0.08)] border border-[rgba(37,99,235,0.15)] flex items-center justify-center flex-shrink-0">
                  <c.icon className="w-4 h-4 text-[#3b82f6]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-white mb-1">{c.title}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed">{c.description}</p>
                </div>
              </div>
            </div>
          ))}
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium text-[#3b82f6]"
            >
              Visa mer
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-center text-[13px] text-white/40 italic mt-8">
          Du har alltid kontroll — AI gör bara jobbet.
        </p>
      </div>
    </section>
  );
};
