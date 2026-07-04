import { Sparkles, ShieldCheck, Activity } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

interface Props {
  userName?: string;
  companyName?: string;
}

/**
 * Premium white-label dashboard hero — replaces the generic dashboard
 * header when a tenant is resolved. Uses tenant logo, name, brand color
 * and configured AI identity to communicate "this is your private platform".
 */
export function WLDashboardHero({ userName, companyName }: Props) {
  const { tenant } = useTenant();
  if (!tenant) return null;

  const aiName = tenant.ai?.ai_name || "AI Ekonom";
  const greeting = userName ? `Välkommen tillbaka, ${userName}` : "Välkommen tillbaka";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8"
      style={{
        borderColor: `hsl(var(--brand-primary) / 0.2)`,
        background: `linear-gradient(135deg, hsl(var(--brand-primary) / 0.06) 0%, hsl(var(--card)) 60%)`,
      }}
    >
      {/* Brand accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: `hsl(var(--brand-primary))` }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-start gap-4 min-w-0">
          {tenant.branding.logo_url ? (
            <img
              src={tenant.branding.logo_url}
              alt={tenant.name}
              className="h-12 w-12 rounded-xl object-contain bg-white p-1.5 shrink-0 border"
              style={{ borderColor: `hsl(var(--brand-primary) / 0.2)` }}
            />
          ) : (
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: `hsl(var(--brand-primary))` }}
            >
              {tenant.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="text-[10px] uppercase font-bold tracking-[0.14em]"
              style={{ color: `hsl(var(--brand-primary))` }}
            >
              {tenant.name} · Ekonomiplattform
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mt-0.5 truncate">
              {greeting}
              {companyName ? <span className="text-muted-foreground font-medium"> · {companyName}</span> : null}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Spårbar AI
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Revisionssäker
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>Privat plattform</span>
            </div>
          </div>
        </div>

        {/* AI identity badge */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border bg-background/60 backdrop-blur-sm shrink-0"
          style={{ borderColor: `hsl(var(--brand-primary) / 0.25)` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `hsl(var(--brand-primary))` }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">{aiName}</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">Live · Aktiv just nu</div>
          </div>
        </div>
      </div>
    </div>
  );
}
