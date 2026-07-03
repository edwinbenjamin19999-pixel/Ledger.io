import { ShieldCheck, Lock, EyeOff } from "lucide-react";

const items = [
  "Skatteverket-integration",
  "BankID-verifiering",
  "GDPR-efterlevnad",
  "BAS 2026",
  "Revisionssäkra loggar",
  "Multi-tenant RLS",
];

const securityItems = [
  { Icon: ShieldCheck, label: "Svenska servrar", sub: "Hostad i Sverige" },
  { Icon: Lock, label: "End-to-end krypterad", sub: "AES-256" },
  { Icon: EyeOff, label: "Ingen delning", sub: "Vi säljer aldrig din data" },
];

/**
 * FLAT TRUST-BLOCK — vit sektion med border-2-badges (tjocka kanter är
 * flat-systemets strukturmarkör). Ikoner i tintade cirklar.
 */
export const TrustCompliance = () => {
  return (
    <section className="bg-white py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.15em] text-[#2563EB]">
          Byggt för svensk regelefterlevnad
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-lg border-2 border-gray-200 bg-white px-4 py-6 text-center text-sm font-semibold text-[#0F1B2D] transition-colors duration-200 hover:border-[#2563EB]"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          {securityItems.map(({ Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#059669]">
                <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="text-sm font-bold text-[#0F1B2D]">{label}</span>
              <span className="text-xs text-[#0F1B2D]/50">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
