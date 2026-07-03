import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const QUICK_LINKS = [
  { to: "/", label: "Startsida" },
  { to: "/funktioner", label: "Funktioner" },
  { to: "/priser", label: "Priser" },
  { to: "/contact", label: "Kontakt" },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: "#0f1f35" }}
    >
      {/* Ambient glow — matches the landing hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(29,217,240,0.10) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <Link
          to="/"
          className="text-xl font-semibold tracking-tight text-white"
          style={{ marginBottom: 48 }}
        >
          Ledger<span style={{ color: "#3b82f6" }}>.io</span>
        </Link>

        <p
          className="font-mono text-white/40"
          style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}
        >
          Fel 404
        </p>
        <h1
          className="font-bold text-white"
          style={{ fontSize: "clamp(40px, 8vw, 72px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          Sidan kunde inte hittas.
        </h1>
        <p className="mt-4 max-w-md text-white/55" style={{ fontSize: 16, lineHeight: 1.6 }}>
          Länken kan vara felstavad eller så har sidan flyttat. Här är några vägar tillbaka.
        </p>

        <nav className="mt-9 flex flex-wrap items-center justify-center" style={{ gap: 10 }}>
          <Link
            to="/"
            className="font-semibold text-[#050d1a] transition-transform hover:scale-[1.02]"
            style={{ background: "#ffffff", padding: "12px 24px", borderRadius: 10, fontSize: 15 }}
          >
            Till startsidan →
          </Link>
          {QUICK_LINKS.slice(1).map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="border border-white/20 text-white/80 transition-colors hover:border-white/50 hover:text-white"
              style={{ padding: "12px 20px", borderRadius: 10, fontSize: 15 }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default NotFound;
