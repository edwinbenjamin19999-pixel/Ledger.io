import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ResolvedTenant } from "@/lib/tenant/resolveTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { setActiveTenantSlug } from "@/hooks/useUserTenants";

interface Props { tenant: ResolvedTenant }

export const WLLoginCard = ({ tenant }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const primary = tenant.branding.primary_color;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setLoading(false);
      toast.error(error?.message || "Inloggning misslyckades");
      return;
    }

    // Bind session to this tenant BEFORE navigating
    setActiveTenantSlug(tenant.slug);

    // Confirm session is actually persisted before navigating, so the
    // advisor shell's useAuth() sees a real user instead of redirecting back.
    for (let i = 0; i < 20; i++) {
      const { data: s } = await supabase.auth.getSession();
      if (s.session?.user) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    setLoading(false);
    toast.success("Inloggad");

    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    const dest = from && from.startsWith("/wl/app") ? from : "/wl/app/dashboard";
    navigate(dest, { replace: true });
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] px-6 py-12 lg:px-16">
      <div
        className="w-full max-w-[460px] bg-white rounded-3xl p-8 lg:p-10 space-y-7"
        style={{
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "0 30px 80px rgba(15, 23, 42, 0.08)",
        }}
      >
        {/* Mobile header */}
        <div className="lg:hidden text-center space-y-2">
          {tenant.branding.logo_url
            ? <img src={tenant.branding.logo_url} alt={tenant.name} className="h-10 mx-auto" />
            : <div className="text-2xl font-bold" style={{ color: primary }}>{tenant.name}</div>}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Logga in</h2>
          <p className="text-[15px] text-[#64748B] leading-relaxed">
            Säker åtkomst till din ekonomiplattform.
          </p>
        </div>

        {tenant.login.show_bankid && (
          <>
            <button
              type="button"
              onClick={() => toast.info("BankID-inloggning är under aktivering — använd e-post och lösenord nedan tills vidare.")}
              className="w-full h-[52px] rounded-2xl font-semibold text-[15px] text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 opacity-80"
              style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)` }}
              title="BankID-inloggning aktiveras snart"
            >
              <ShieldCheck className="h-5 w-5" />
              Logga in med BankID
            </button>
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E2E8F0]" />
              <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold">eller</span>
              <div className="flex-1 h-px bg-[#E2E8F0]" />
            </div>
          </>
        )}

        {tenant.login.show_password_login && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">E-post</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[52px] px-4 rounded-2xl border border-[#E2E8F0] bg-white text-[15px] text-[#0F172A] outline-none transition-all focus:border-transparent"
                style={{ boxShadow: "none" }}
                onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${primary}33`)}
                onBlur={(e) => (e.target.style.boxShadow = "none")}
                placeholder="namn@företag.se"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Lösenord</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[52px] px-4 rounded-2xl border border-[#E2E8F0] bg-white text-[15px] text-[#0F172A] outline-none transition-all"
                onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${primary}33`)}
                onBlur={(e) => (e.target.style.boxShadow = "none")}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full h-[52px] rounded-2xl font-semibold text-[15px] text-[#0F172A] border-2 border-[#0F172A] bg-white transition-all hover:bg-[#0F172A] hover:text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Logga in med e-post
            </button>
          </form>
        )}

        <div className="flex items-center justify-between text-sm">
          <button className="text-[#64748B] hover:text-[#0F172A] transition-colors">Glömt lösenord?</button>
          {tenant.login.support_url && (
            <a href={tenant.login.support_url} className="text-[#64748B] hover:text-[#0F172A] transition-colors">
              Support
            </a>
          )}
        </div>

        <div className="pt-4 border-t border-[#F1F5F9] text-center">
          <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold">
            {tenant.login.footer_attribution}
          </p>
        </div>
      </div>
    </div>
  );
};
