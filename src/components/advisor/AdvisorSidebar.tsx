import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  CalendarClock,
  Zap,
} from "lucide-react";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmApprovalQueue } from "@/hooks/useFirmApprovalQueue";
import { useFirmTasks } from "@/hooks/useFirmTasks";
import { useClientRequests } from "@/hooks/useClientRequests";
import { useFirmSupplierInvoices } from "@/hooks/useFirmSupplierInvoices";
import { useBureauBranding } from "@/hooks/useBureauBranding";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  key: string;
}

/**
 * WL sidebar shows ONLY bureau-level navigation. Per-client work happens in
 * standard NorthLedger surfaces (/dashboard, /invoices, /vat, …) — once the
 * advisor opens a client from the bureau overview, the global active-client
 * context routes them through the standard NorthLedger shell instead.
 */
const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Byrå",
    items: [
      { title: "Byråöversikt", url: "/wl/app/dashboard", icon: LayoutDashboard, key: "dashboard" },
      { title: "Klienter", url: "/wl/app/clients", icon: Users, key: "clients" },
      { title: "Deadlines", url: "/wl/app/deadlines", icon: CalendarClock, key: "deadlines" },
      { title: "Automation", url: "/wl/app/automation", icon: Zap, key: "automation" },
    ],
  },
  {
    label: "Inställningar",
    items: [
      { title: "Inställningar", url: "/wl/app/settings", icon: SettingsIcon, key: "settings" },
    ],
  },
];

export const AdvisorSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { firmId, firmName, firmLogo } = useAdvisorContext();
  const branding = useBureauBranding();
  const displayName = branding.bureauName || firmName || "Byrå";
  const displayLogo = branding.logoUrl || firmLogo;
  const { data: approvals = [] } = useFirmApprovalQueue();
  const { data: tasks = [] } = useFirmTasks(firmId);
  const { data: requests = [] } = useClientRequests();
  const { data: supplierInvoices = [] } = useFirmSupplierInvoices();

  const now = Date.now();
  const tasksDueSoon = tasks.filter(
    (t) =>
      t.due_date &&
      t.status !== "done" &&
      (new Date(t.due_date).getTime() - now) / 86400000 <= 7,
  ).length;
  const requestsAwaiting = requests.filter((r) => r.status === "awaiting_client").length;
  const supplierAwaiting = supplierInvoices.filter((s) => s.stage === "awaiting_client").length;

  const badgeFor = (key: string): number | null => {
    if (key === "approvals" && approvals.length > 0) return approvals.length;
    if (key === "tasks" && tasksDueSoon > 0) return tasksDueSoon;
    if (key === "requests" && requestsAwaiting > 0) return requestsAwaiting;
    if (key === "supplier-invoices" && supplierAwaiting > 0) return supplierAwaiting;
    return null;
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 [&_[data-sidebar=sidebar]]:!bg-transparent">
      <SidebarContent
        className="relative overflow-hidden text-white p-0"
        style={{
          background: "hsl(var(--brand-sidebar, var(--brand-primary)))",
          backgroundImage:
            "linear-gradient(180deg, hsl(var(--brand-sidebar, var(--brand-primary))) 0%, hsl(var(--brand-primary)) 100%)",
        }}
      >
        <div className="relative z-10 flex flex-col h-full">
          {/* Brand header */}
          <div className={`px-4 pt-5 pb-6 ${collapsed ? "px-2" : ""}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {displayLogo ? (
                <img
                  src={displayLogo}
                  alt={displayName}
                  className="h-8 w-8 rounded-lg object-contain bg-white/5 p-0.5 shrink-0"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: "hsl(var(--brand-primary))" }}
                >
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                    {branding.bureauSubtitle || "Workspace"}
                  </div>
                  <div
                    className="text-sm font-semibold text-white truncate"
                    title={displayName}
                  >
                    {displayName.length > 18 ? `${displayName.slice(0, 18)}…` : displayName}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 space-y-4 overflow-y-auto pb-4">
            {groups.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                    {group.label}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = location.pathname.startsWith(item.url);
                    const badge = badgeFor(item.key);
                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? "bg-white/25 text-white font-semibold"
                            : "text-white/80 hover:bg-white/15 hover:text-white"
                        }`}
                      >
                        {active && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-white"
                          />
                        )}
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate flex-1">{item.title}</span>}
                        {!collapsed && badge !== null && (
                          <span className="text-[10px] font-bold bg-white text-[hsl(var(--brand-primary))] rounded-full px-1.5 py-0.5 tabular-nums">
                            {badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          {!collapsed && branding.showPoweredBy && (
            <div className="px-4 py-4 text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold">
              Powered by NorthLedger
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
