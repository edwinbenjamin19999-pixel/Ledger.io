import { Shield, Lock, Building2, Landmark, BookOpen, FileCheck, Database, ShieldCheck } from "lucide-react";

const trustItems = [
  { icon: Shield, name: "Direktkoppling Skatteverket", label: "Live", badgeClass: "bg-[#E1F5EE] text-[#1D9E75] border border-[#BFE6D6]" },
  { icon: Lock, name: "BankID-verifierat", label: "Säker", badgeClass: "bg-[rgba(34,211,238,0.1)] text-[#3b82f6] border border-[rgba(34,211,238,0.2)]" },
  { icon: Building2, name: "Bolagsverket", label: "Integrerat", badgeClass: "bg-[#F1F5F9] text-[#1E3A5F] border border-[#E2E8F0]" },
  { icon: BookOpen, name: "K2 & K3", label: "Stöd", badgeClass: "bg-[#E1F5EE] text-[#1D9E75] border border-[#BFE6D6]" },
  { icon: FileCheck, name: "Full revisionslogg", label: "Spårbart", badgeClass: "bg-[rgba(34,211,238,0.1)] text-[#3b82f6] border border-[rgba(34,211,238,0.2)]" },
  { icon: Database, name: "BAS 2026", label: "Kontoplan", badgeClass: "bg-[#F1F5F9] text-[#1E3A5F] border border-[#E2E8F0]" },
  { icon: ShieldCheck, name: "GDPR", label: "Dataskydd", badgeClass: "bg-[#E1F5EE] text-[#1D9E75] border border-[#BFE6D6]" },
  { icon: Shield, name: "Spårbar AI", label: "Verifierbar", badgeClass: "bg-[#F1F5F9] text-[#1E3A5F] border border-[#E2E8F0]" },
  { icon: ShieldCheck, name: "Audit-ready", label: "Granskbar", badgeClass: "bg-[#E1F5EE] text-[#1D9E75] border border-[#BFE6D6]" },
];

const banks = ["SEB", "Nordea", "Handelsbanken", "Swedbank"];

const mobileTrust = [
  { icon: Shield, name: "Skatteverket" },
  { icon: Lock, name: "BankID" },
  { icon: ShieldCheck, name: "GDPR" },
  { icon: Database, name: "BAS 2026" },
];

export const TrustBanner = () => {
  return (
    <section className="py-12 sm:py-14 bg-[#0B1D2A] border-y border-white/[0.06]">
      <div className="container mx-auto px-4 sm:px-6">
        <p className="hidden sm:block text-center text-[18px] text-white max-w-2xl mx-auto mb-2 font-semibold tracking-tight">
          Full kontroll. Full spårbarhet.
        </p>
        <p className="hidden sm:block text-center text-[13px] text-white/50 max-w-2xl mx-auto mb-5">
          Byggt för svenska företag — Skatteverket, Bankintegration, BAS 2026, Revisionslogg, Spårbar AI
        </p>

        {/* Mobile: 4 minimal items */}
        <div className="sm:hidden flex flex-wrap justify-center items-center gap-x-5 gap-y-3">
          {mobileTrust.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-white/50">
              <item.icon className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-[13px] font-medium">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Desktop: full badges */}
        <div className="hidden sm:flex flex-wrap justify-center items-center gap-x-6 gap-y-3 sm:gap-x-9 mb-4">
          {trustItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 text-white/40 transition-all duration-200 hover:text-white/70 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.name}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.badgeClass}`}>
                {item.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-white/40">
            <Landmark className="w-4 h-4" />
            <span className="text-sm font-medium">{banks.join(" · ")}</span>
          </div>
        </div>
        <p className="hidden sm:block text-center text-[13px] text-white/40 italic">
          Ett nytt standard-system för företag som vill automatisera sin ekonomi.
        </p>
      </div>
    </section>
  );
};
