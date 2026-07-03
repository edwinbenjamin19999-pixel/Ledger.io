import { Link } from "react-router-dom";
import { Mail, MapPin, Shield, CheckCircle, FileText, Eye } from "lucide-react";
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
  { label: "Om Bokfy", to: "/about" },
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
              <span className="text-2xl font-[800] text-white tracking-tight">Bok</span>
              <span className="text-2xl font-[800] text-[#3b82f6] tracking-tight">fy</span>
            </Link>
            <p className="text-sm text-white/60 max-w-[260px] leading-relaxed">
              AI-driven bokföringsplattform för SME:s och växande företag i Sverige
            </p>
            <div className="space-y-2.5 text-sm text-white/60">
              <a href="mailto:info@bokfy.se" className="flex items-center gap-2 hover:text-[#3b82f6] transition-colors">
                <Mail className="w-4 h-4 shrink-0" />
                info@bokfy.se
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
                <Link to="/auth">Testa Bokfy</Link>
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
        <div className="container mx-auto px-4 sm:px-6 py-6 flex justify-center items-center">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Bokfy. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
};
