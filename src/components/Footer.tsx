import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Shield, CheckCircle, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const productLinks = [
  { label: "Funktioner", to: "/features" },
  { label: "Priser", to: "/pricing" },
  { label: "Integrationer", to: "/public-integrations" },
  { label: "AI-assistent", to: "/features/ai-assistant" },
  { label: "Automatiserad bokföring", to: "/features/accounting-automation" },
  { label: "Budget & Prognos", to: "/features/budget-forecast" },
  { label: "För redovisningsbyråer", to: "/accounting-firms" },
];

const companyLinks = [
  { label: "Om Ledger.io", to: "/about" },
  { label: "Kontakt", to: "/contact" },
  { label: "Karriär", to: "/careers" },
  { label: "Redovisningsbyrå-portal", to: "/accounting-firms" },
  { label: "Roadmap", to: "/roadmap" },
];

const resourceLinks = [
  { label: "FAQ", to: "/faq" },
  { label: "AI-bokföring förklarat", to: "/resources/ai-bookkeeping" },
  { label: "Svensk momsguide", to: "/resources/vat-guide" },
  { label: "Bokföringsguider", to: "/resources/accounting-guides" },
  { label: "Blogg", to: "/blog" },
];

const legalLinks = [
  { label: "Integritetspolicy", to: "/privacy" },
  { label: "Användarvillkor", to: "/terms-of-service" },
  { label: "GDPR & Dataskydd", to: "/gdpr-info" },
  { label: "Säkerhet", to: "/security-info" },
  { label: "Cookies", to: "/cookies" },
];

const trustItems = [
  { icon: Shield, text: "Svensk redovisningsstandard" },
  { icon: FileText, text: "BAS-kontoplan" },
  { icon: CheckCircle, text: "K2/K3-stöd" },
  { icon: Shield, text: "GDPR-säkrad" },
  { icon: Eye, text: "Spårbarhet & revision" },
];

const integrations = [
  "Shopify", "Sitoo", "Stripe", "Klarna", "Swish",
  "SEB", "Nordea", "Handelsbanken", "Swedbank",
];

const FooterLinkColumn = ({ title, links }: { title: string; links: { label: string; to: string }[] }) => (
  <div className="space-y-4">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">{title}</h4>
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.to + link.label}>
          <Link to={link.to} className="text-sm text-white/70 hover:text-[#3b82f6] transition-colors">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export const Footer = () => {
  return (
    <footer className="text-white bg-[#0a1628]" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Main grid */}
      <div className="container mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand / Contact */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-0">
              <span className="text-2xl font-[800] text-white tracking-tight">Ledger</span>
              <span className="text-2xl font-[800] text-[#3b82f6] tracking-tight">.io</span>
            </Link>
            <p className="text-sm text-white/60 max-w-[260px] leading-relaxed">
              AI-driven bokföringsplattform för SME:s och växande företag i Sverige
            </p>
            <div className="space-y-2.5 text-sm text-white/60">
              <a href="tel:+46761646986" className="flex items-center gap-2 hover:text-[#3b82f6] transition-colors">
                <Phone className="w-4 h-4 shrink-0" />
                +46 76 164 69 86
              </a>
              <a href="mailto:info@ledger.io" className="flex items-center gap-2 hover:text-[#3b82f6] transition-colors">
                <Mail className="w-4 h-4 shrink-0" />
                info@ledger.io
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Stockholm, Sverige</span>
              </div>
            </div>
            <Link to="/contact" className="inline-flex items-center gap-1 text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors font-medium">
              Boka demo →
            </Link>
          </div>

          <FooterLinkColumn title="Produkt" links={productLinks} />
          <FooterLinkColumn title="Företag" links={companyLinks} />
          <FooterLinkColumn title="Resurser" links={resourceLinks} />
          <FooterLinkColumn title="Juridiskt" links={legalLinks} />
        </div>
      </div>

      {/* Compliance trust strip */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {trustItems.map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-xs text-white/60">
                <item.icon className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration badge row */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap justify-center gap-2.5">
            {integrations.map((name) => (
              <span key={name} className="text-[11px] text-white/55 border border-white/15 rounded-full px-3 py-1">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA strip */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 sm:p-10 text-center max-w-2xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-white/90 mb-2">
              Redo att förenkla din bokföring?
            </h3>
            <p className="text-sm text-white/50 mb-6">
              Låt AI hantera det repetitiva arbetet så att du kan fokusera på ditt företag.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-white text-[#050d1a] hover:bg-white/90 font-semibold">
                <Link to="/auth">Testa Ledger.io</Link>
              </Button>
              <Button asChild variant="glass" size="lg" className="hover:scale-[1.02]">
                <Link to="/contact">Boka demo</Link>
              </Button>
            </div>
            <p className="text-xs text-white/50 mt-4">Ingen bindning. Kom igång på några minuter.</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Ledger.io. Alla rättigheter förbehållna.
          </p>
          <div className="flex gap-4">
            {/* Facebook */}
            <a href="https://www.facebook.com/NorthLedgerapp/" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#3b82f6] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="https://linkedin.com/company/northledger" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#3b82f6] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            {/* Instagram */}
            <a href="https://www.instagram.com/ledger.io?igsh=Y2lrNHZ2OGpkaTBz&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#3b82f6] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            {/* TikTok */}
            <a href="https://tiktok.com/@northledger" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#3b82f6] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
            {/* X / Twitter */}
            <a href="https://twitter.com/northledger" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#3b82f6] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
