import { ResolvedTenant } from "@/lib/tenant/resolveTenant";
import { CheckCircle2, Sparkles, Activity } from "lucide-react";

interface Props { tenant: ResolvedTenant }

export const WLLeftPanel = ({ tenant }: Props) => {
  const primary = tenant.branding.primary_color;

  return (
    <div
      className="relative hidden lg:flex lg:w-[52%] flex-col justify-between p-12 xl:p-16 overflow-hidden text-white"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, #0f172a 100%)`,
      }}
    >
      {/* Soft radial light */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ background: `radial-gradient(circle at 20% 20%, ${primary}55 0%, transparent 50%)` }}
      />
      {/* Grain texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>")`,
        }}
      />

      <div className="relative z-10 flex items-center gap-3">
        {tenant.branding.logo_url ? (
          <img src={tenant.branding.logo_url} alt={tenant.name} className="h-9 w-auto" />
        ) : (
          <div className="text-xl font-bold tracking-tight">{tenant.name}</div>
        )}
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50 ml-1">
          Workspace
        </span>
      </div>

      <div className="relative z-10 space-y-10 max-w-xl">
        <div className="space-y-5">
          <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
            {tenant.login.headline}
          </h1>
          <p className="text-lg xl:text-xl text-white/70 leading-relaxed">
            {tenant.login.subheadline}
          </p>
        </div>

        <ul className="space-y-3">
          {tenant.login.trust_bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-[15px] text-white/85">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: primary }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* AI identity block */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: `${primary}30`, border: `1px solid ${primary}60` }}
            >
              <Sparkles className="h-5 w-5" style={{ color: primary }} />
            </div>
            <div>
              <div className="font-semibold text-white">{tenant.ai.ai_name}</div>
              <div className="text-xs text-white/50">Spårbar AI · Revisionslogg aktiverad</div>
            </div>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Arbetar i bakgrunden med att bokföra, analysera, varna och föreslå nästa steg.
          </p>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/40 font-bold">
            <Activity className="h-3 w-3" />
            <span>Live · 12 transaktioner bokförda idag</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-xs text-white/40">
        © {new Date().getFullYear()} {tenant.name}
      </div>
    </div>
  );
};
