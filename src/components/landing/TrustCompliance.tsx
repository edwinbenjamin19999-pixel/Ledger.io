const items = [
  "Skatteverket-integration",
  "BankID-verifiering",
  "GDPR-efterlevnad",
  "BAS 2026",
  "Revisionssäkra loggar",
  "Multi-tenant RLS",
];

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 4.22-5.36" />
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.8 19.8 0 0 1-3.17 4.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const securityItems = [
  { Icon: ShieldIcon, label: "Svenska servrar", sub: "Hostad i Sverige" },
  { Icon: LockIcon, label: "End-to-end krypterad", sub: "AES-256" },
  { Icon: EyeOffIcon, label: "Ingen delning", sub: "Vi säljer aldrig din data" },
];

export const TrustCompliance = () => {
  return (
    <section className="section-shell">
      <div className="section-inner">
        <p className="section-label text-center">Byggt för svensk regelefterlevnad</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-10">
          {items.map((item) => (
            <div
              key={item}
              className="dark-surface-card text-center text-white/75 text-sm font-medium"
              style={{ padding: "28px 24px" }}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 max-w-2xl mx-auto">
          {securityItems.map(({ Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <span className="text-white/30">
                <Icon />
              </span>
              <span className="text-white/40 text-xs">{label}</span>
              <span className="text-white/20 text-[10px]">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

