import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";

interface HeaderProps {
  /** Force dark text/logo even before scroll (for pages with white/light hero backgrounds) */
  lightBg?: boolean;
}

export const Header = ({ lightBg = false }: HeaderProps = {}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const dark = scrolled || lightBg;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Funktioner", href: "/funktioner" },
    { label: "Guide", href: "/resources/guide" },
    { label: "Priser", href: "/priser" },
    { label: "Kontakt", href: "/contact" },
  ];

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 h-[60px] ${
        dark
          ? "bg-[#050d1a]/90 backdrop-blur-sm border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-0">
          <span className="text-xl font-[800] text-white">North</span>
          <span className="text-xl font-[800] text-[#3b82f6] transition-colors">Ledger</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isAnchor = link.href.startsWith("#");
            const cls = "text-sm transition-colors text-white/70 hover:text-white";
            return isAnchor ? (
              <a key={link.label} href={link.href} className={cls}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} to={link.href} className={cls}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            Logga in
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-sm h-9 bg-white text-[#050d1a] hover:bg-white/90 gap-1.5 rounded-lg font-semibold"
          >
            Kom igång gratis
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 transition-colors text-white/80"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0f1f35] border-b border-[rgba(255,255,255,0.05)] px-4 py-4 space-y-3">
          {navLinks.map((link) => {
            const isAnchor = link.href.startsWith("#");
            const cls = "block text-sm text-white/60 hover:text-white";
            return isAnchor ? (
              <a
                key={link.label}
                href={link.href}
                className={cls}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className={cls}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <Button
            size="sm"
            onClick={() => { navigate("/auth"); setMobileOpen(false); }}
            className="w-full h-10 text-sm bg-white text-[#050d1a] hover:bg-white/90 rounded-lg font-semibold"
          >
            Kom igång gratis
          </Button>
        </div>
      )}
    </header>
  );
};
