import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";

interface HeaderProps {
  /** Behålls för bakåtkompatibilitet — flat-headern är alltid solid vit. */
  lightBg?: boolean;
}

/**
 * FLAT HEADER — solitt vitt block, ingen transparens eller blur.
 * Skarp kant mot innehållet vid scroll (border, inte skugga).
 */
export const Header = (_props: HeaderProps = {}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

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
      className={`fixed top-0 z-50 w-full h-[60px] bg-white transition-colors duration-200 ${
        scrolled ? "border-b-2 border-gray-100" : "border-b-2 border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-0">
          <span className="text-xl font-extrabold tracking-tight text-[#0F1B2D]">Bok</span>
          <span className="text-xl font-extrabold tracking-tight text-primary">fy</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isAnchor = link.href.startsWith("#");
            const cls =
              "text-sm font-medium text-[#0F1B2D]/70 hover:text-primary transition-colors duration-200";
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
            className="text-sm text-[#0F1B2D]/70 hover:text-[#0F1B2D]"
          >
            Logga in
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")} className="text-sm h-9 gap-1.5">
            Kom igång gratis
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-[#0F1B2D] transition-colors"
          aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown — solitt block, tjock kant */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b-2 border-gray-100 px-4 py-4 space-y-3">
          {navLinks.map((link) => {
            const isAnchor = link.href.startsWith("#");
            const cls =
              "block text-sm font-medium text-[#0F1B2D]/70 hover:text-primary transition-colors";
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
            className="w-full h-10 text-sm"
          >
            Kom igång gratis
          </Button>
        </div>
      )}
    </header>
  );
};
