import {
  BookOpen,
  Receipt,
  FileText,
  Users,
  Truck,
  Landmark,
  Package,
  TrendingUp,
  BrainCircuit,
  Target,
} from "lucide-react";

const items = [
  { icon: BookOpen, label: "Bokföring" },
  { icon: Receipt, label: "Moms & AGI" },
  { icon: FileText, label: "Fakturering" },
  { icon: Users, label: "Kundreskontra" },
  { icon: Truck, label: "Leverantörsreskontra" },
  { icon: Landmark, label: "Bankintegration" },
  { icon: Package, label: "Lager & marginaler" },
  { icon: TrendingUp, label: "Analys" },
  { icon: BrainCircuit, label: "AI CFO" },
  { icon: Target, label: "Budget & prognos" },
];

const mobileItems = items.slice(0, 4);

export const SystemBreadth = () => {
  return (
    <section className="py-20 sm:py-28 bg-[#0B1D2A]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <h2
            className="font-[800] text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1.5px" }}
          >
            Detta ingår i{" "}
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#3b82f6] bg-clip-text text-transparent">
              Bokfy
            </span>
          </h2>
        </div>

        {/* Mobile: minimal list, 4 items */}
        <div className="sm:hidden max-w-sm mx-auto divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {mobileItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 py-4">
              <Icon className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />
              <span className="text-[16px] text-white/85 font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Desktop: original grid */}
        <div className="hidden sm:grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
          {items.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm hover:border-[rgba(37,99,235,0.2)] hover:bg-[rgba(37,99,235,0.04)] hover:shadow-[0_0_20px_rgba(37,99,235,0.08)] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(37,99,235,0.08)] border border-[rgba(37,99,235,0.12)] flex items-center justify-center group-hover:border-[rgba(37,99,235,0.25)] transition-colors duration-300">
                <Icon className="w-5 h-5 text-[#3b82f6] group-hover:text-[#3b82f6] transition-colors duration-300" />
              </div>
              <span className="text-[13px] font-medium text-white/60 group-hover:text-white/80 transition-colors duration-300 text-center">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
