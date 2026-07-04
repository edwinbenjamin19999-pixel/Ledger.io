import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";

interface HeaderProps {
  /** Behålls för bakåtkompatibilitet. */
  lightBg?: boolean;
}

/**
 * MINIMALIST MODERN HEADER — halvtransparent vit med backdrop-blur,
 * gradient på wordmarkets senare del och gradient-CTA. Subtil skugga
 * först vid scroll.
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
      className={`fixed top-0 z-50 h-[60px] w-full bg-white/85 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-sm border-b border-border" : "border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex h-full items-center justify-between px-4 sm:px-6">
        {/* Logo — gradient-signatur på "niq" */}
        <Link to="/" className="flex items-center gap-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2">
          <span className="text-xl font-extrabold tracking-tight text-foreground">Cog</span>
          <span className="text-xl font-extrabold tracking-tight text-[#0052FF]">niq</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm">
            Logga in
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")} className="group h-9 gap-1.5 rounded-full px-4 text-sm">
            Kom igång gratis
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="rounded-md p-2 text-foreground transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]"
          aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="space-y-3 border-b border-border bg-white/95 px-4 py-4 backdrop-blur-md md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Button
            size="sm"
            onClick={() => { navigate("/auth"); setMobileOpen(false); }}
            className="h-11 w-full text-sm"
          >
            Kom igång gratis
          </Button>
        </div>
      )}
    </header>
  );
};
