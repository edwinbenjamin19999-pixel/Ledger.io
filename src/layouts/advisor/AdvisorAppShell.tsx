import { Outlet, useLocation, Navigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdvisorSidebar } from "@/components/advisor/AdvisorSidebar";
import { AdvisorTopBar } from "@/components/advisor/AdvisorTopBar";
import { AdvisorMobileApp } from "@/components/mobile/advisor/AdvisorMobileApp";
import { ClientContextBar } from "@/components/advisor/priority/ClientContextBar";
import { GlobalCommandBar } from "@/components/advisor/command/GlobalCommandBar";
import { GlobalAIAssistant } from "@/components/layout/GlobalAIAssistant";
import { ProactiveAIHelper } from "@/components/layout/ProactiveAIHelper";
import { DailyAssistantModal } from "@/components/layout/DailyAssistantModal";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

interface Props {
  user: User;
  signOut: () => Promise<void>;
}

export const AdvisorAppShell = ({ user, signOut }: Props) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { firmName, firmLogo } = useAdvisorContext();

  if (!location.pathname.startsWith("/wl")) {
    console.warn("[ADVISOR-GUARD] AdvisorAppShell mounted outside /wl — routing leak");
    return <Navigate to="/dashboard" replace />;
  }

  if (isMobile) {
    return (
      <div className="wl-scope">
        <AdvisorMobileApp user={user} signOut={signOut} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="wl-scope min-h-screen flex w-full" style={{ background: "#F8FAFC" }}>
        <AdvisorSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Subtle brand-tinted radial highlight, mirroring WL login surface */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
            style={{
              background:
                "radial-gradient(ellipse at top right, hsl(var(--brand-primary) / 0.08), transparent 60%)",
            }}
          />
          <AdvisorTopBar
            user={user}
            firmName={firmName}
            firmLogo={firmLogo}
            onSignOut={signOut}
          />
          <ClientContextBar />
          <GlobalCommandBar />
          <main className="flex-1 overflow-auto relative z-10 transition-[background,opacity] duration-300 ease-out">
            <DailyAssistantModal />
            <Outlet />
          </main>
          <GlobalAIAssistant />
          <ProactiveAIHelper />
        </div>
      </div>
    </SidebarProvider>
  );
};

