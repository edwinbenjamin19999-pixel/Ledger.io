import { useParams } from "react-router-dom";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { WLLeftPanel } from "@/components/wl/WLLeftPanel";
import { WLLoginCard } from "@/components/wl/WLLoginCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const Inner = () => {
  const { tenant, loading, error } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[image:var(--brand-surface-dark)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !tenant) {
    const isCustomDomain = typeof window !== "undefined" &&
      !["northledger.se", "localhost", "app.northledger.se", "www.northledger.se"].includes(window.location.hostname.toLowerCase()) &&
      !window.location.hostname.endsWith(".lovable.app") &&
      !window.location.hostname.endsWith(".lovableproject.com");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-[#0F172A]">Workspace hittades inte</h1>
          <p className="text-[#64748B]">Den här arbetsytan finns inte eller är inte aktiv.</p>
          {!isCustomDomain && (
            <a href="https://northledger.se" className="inline-block text-sm font-semibold text-[#3b82f6] hover:underline">
              Gå till Ledger.io →
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[image:var(--brand-surface-dark)] relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--brand-primary)/0.18),transparent_55%)]" aria-hidden />
      <WLLeftPanel tenant={tenant} />
      <WLLoginCard tenant={tenant} />
    </div>
  );
};

const WhiteLabelLogin = () => {
  const { slug } = useParams<{ slug: string }>();
  return (
    <TenantProvider slug={slug}>
      <Inner />
    </TenantProvider>
  );
};

export default WhiteLabelLogin;
