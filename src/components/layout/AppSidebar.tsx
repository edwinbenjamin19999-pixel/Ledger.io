import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, Eye, Building, Settings, Shield, Sparkles,
  ChevronDown, Settings2, Plus, Bug, Blocks, Users, Building2, ArrowLeftRight,
} from "lucide-react";
import { useUnresolvedErrorCount } from "@/hooks/useUnresolvedErrorCount";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BrandedLogo } from "@/components/wl/BrandedLogo";
import { useTenant } from "@/contexts/TenantContext";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { useModuleOrder } from "@/hooks/useModuleOrder";
import { CustomizeModulesModal } from "./CustomizeModulesModal";
import { buildNavGroups } from "@/lib/sidebar-nav-config";
import { usePendingApprovalCount } from "@/hooks/usePendingApprovalCount";
import { GettingStartedChecklist } from "@/components/onboarding/GettingStartedChecklist";

const bottomItems = [
  { path: "/settings", label: "Inställningar", icon: Settings },
  { path: "/integrations", label: "Integrationer", icon: Blocks },
  { path: "/companies", label: "Företag & användare", icon: Building2 },
  { path: "/migration", label: "Migrera data", icon: ArrowLeftRight },
  { path: "/audit-log", label: "Revisionslogg", icon: Eye },
  { path: "/gdpr", label: "Compliance & säkerhet", icon: Shield },
  { path: "/guide", label: "Hjälp & guide", icon: BookOpen },
];

export const AppSidebar = () => { const location = useLocation();
  const navigate = useNavigate();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { tenant } = useTenant();
  const { order, hiddenModules, hiddenItems } = useModuleOrder();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const pendingApprovalCount = usePendingApprovalCount();
  const visibleBottomItems = bottomItems;
  const sidebarMenuButtonClass = "flex items-center gap-2 px-3 text-[12px] font-normal text-white/60 border-l-2 border-transparent hover:text-white/85 hover:bg-white/[0.04] cursor-pointer transition-colors rounded-lg whitespace-normal h-8 min-h-0 leading-tight !overflow-visible [&>span:last-child]:!overflow-visible [&>span:last-child]:!whitespace-normal [&>span:last-child]:!text-clip";
  const sidebarMenuButtonActiveClass = tenant
    ? "font-semibold border"
    : "!text-white !bg-white/[0.06] !border-l-2 !border-[#3b82f6]";
  const tenantActiveStyle = tenant
    ? {
        backgroundColor: `hsl(var(--brand-primary) / 0.18)`,
        color: `hsl(var(--brand-primary))`,
        borderColor: `hsl(var(--brand-primary) / 0.4)`,
      }
    : undefined;

  const aiName = tenant?.ai?.ai_name || "AI Ekonom";
  const navGroups = buildNavGroups(aiName);

  // Sort navGroups by user's saved order and filter hidden ones
  const sortedGroups = [...navGroups]
    .filter((g) => !hiddenModules.includes(g.label))
    .sort((a, b) => { const ai = order.indexOf(a.label);
      const bi = order.indexOf(b.label);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  // Filter hidden individual items from each group
  const filteredGroups = sortedGroups
    .map((g) => ({ ...g,
      items: g.items.filter((item: any) => !item.path || !hiddenItems.includes(item.path)),
    }))
    .filter((g) => g.items.length > 0);

  const unresolvedErrors = useUnresolvedErrorCount();
  const allGroups = isPlatformAdmin
    ? [
        ...filteredGroups,
        { label: "Intern",
          items: [
            { path: "/admin", label: "Admin Dashboard", icon: Shield },
            { path: "/admin/errors", label: "Felhantering", icon: Bug, badge: unresolvedErrors > 0 ? unresolvedErrors : undefined },
          ],
        },
      ]
    : filteredGroups;

  return (
    <Sidebar className="bg-[#0B1929] border-r [border-width:0.5px] border-white/[0.06]">
      {/* Logo header (tenant-aware) */}
      <SidebarHeader className="p-4 border-b [border-width:0.5px] border-white/[0.06]">
        <BrandedLogo />
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {allGroups.map((group) => { if (group.items.length === 1) { const item = group.items[0];
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isHeaderShortcut = group.label === "HEM";
            return (
              <SidebarGroup key={group.label} className="py-0.5">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={isActive}
                      className={cn(
                        isHeaderShortcut
                          ? "flex items-center gap-2 px-3 h-9 text-[11px] font-medium uppercase tracking-[0.1em] text-white/40 hover:text-white/60 hover:bg-white/[0.04] cursor-pointer transition-colors rounded-lg"
                          : sidebarMenuButtonClass,
                        isActive && sidebarMenuButtonActiveClass
                      )}
                      style={isActive ? tenantActiveStyle : undefined}
                    >
                      <Icon size={16} strokeWidth={1.5} className={isHeaderShortcut ? "" : "mt-0.5"} />
                      <span className="min-w-0 flex-1 whitespace-normal break-words">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            );
          }

          const isGroupActive = group.items.some((i: any) =>
            i.path ? location.pathname === i.path : i.subItems?.some((s: any) => location.pathname === s.path)
          );

          const defaultExpanded = isGroupActive || ["Gör", "Granska", "Förstå"].includes(group.label);
          return (
            <Collapsible key={group.label} defaultOpen={defaultExpanded} className="group/collapsible">
              <div className="border-t border-white/5 mx-3 my-1" />
              <SidebarGroup className="py-0">
                <CollapsibleTrigger asChild>
                   <SidebarGroupLabel
                     className="cursor-pointer transition-colors flex items-center justify-between pr-2 text-[11px] font-medium uppercase tracking-[0.1em] text-white/40 px-3 h-9 mt-0 mb-0 hover:text-white/60"
                  >
                    {group.label}
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180 text-white/30" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item: any) => { const Icon = item.icon;

                        // Nested sub-items (e.g. Kassaflöde)
                        if (item.subItems) {
                          const subActive = item.subItems.some((s: any) => location.pathname === s.path);
                          return (
                            <Collapsible key={item.label} defaultOpen={subActive} className="group/sub">
                              <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton className={cn(sidebarMenuButtonClass, "justify-between")}>
                                    <span className="flex min-w-0 flex-1 items-start gap-2 whitespace-normal break-words">
                                      <Icon size={16} strokeWidth={1.5} className="mt-0.5" />
                                      <span className="min-w-0 flex-1 whitespace-normal break-words">{item.label}</span>
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/sub:rotate-180" />
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenu className="ml-4 mt-1 border-l border-[hsl(var(--sidebar-divider))] pl-2">
                                    {item.subItems.map((sub: any) => { const SubIcon = sub.icon;
                                      const subIsActive = location.pathname === sub.path;
                                      return (
                                        <SidebarMenuItem key={sub.path}>
                                          <SidebarMenuButton
                                            onClick={() => navigate(sub.path)}
                                            isActive={subIsActive}
                                            className={cn(
                                              sidebarMenuButtonClass,
                                              "text-xs",
                                              subIsActive && sidebarMenuButtonActiveClass
                                            )}
                                            style={subIsActive ? tenantActiveStyle : undefined}
                                          >
                                            <SubIcon size={16} strokeWidth={1.5} className="mt-0.5" />
                                            <span className="min-w-0 flex-1 whitespace-normal break-words">{sub.label}</span>
                                          </SidebarMenuButton>
                                        </SidebarMenuItem>
                                      );
                                    })}
                                  </SidebarMenu>
                                </CollapsibleContent>
                              </SidebarMenuItem>
                            </Collapsible>
                          );
                        }

                        const isActive = location.pathname === item.path;
                        const isAIEkonom = item.path === "/ai-ekonom";
                        const wlElevate = tenant && isAIEkonom;
                        const showPendingBadge =
                          (item.path === "/verifications" || item.path === "/verifikationer") &&
                          pendingApprovalCount > 0;
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              onClick={() => navigate(item.path)}
                              isActive={isActive}
                              className={cn(
                                sidebarMenuButtonClass,
                                isActive && sidebarMenuButtonActiveClass,
                                wlElevate && "font-semibold border-l-[3px] pl-[calc(0.75rem-1px)]"
                              )}
                              style={
                                isActive
                                  ? tenantActiveStyle
                                  : wlElevate
                                    ? { borderLeftColor: `hsl(var(--brand-primary))` }
                                    : undefined
                              }
                            >
                              <Icon size={16} strokeWidth={1.5} className="mt-0.5" />
                              <span className="flex-1 whitespace-normal break-words">{item.label}</span>
                              {showPendingBadge && (
                                <span
                                  className="ml-auto bg-[#E24B4A] text-white rounded-full text-[9px] font-medium px-[5px] py-px tabular-nums"
                                  title={`${pendingApprovalCount} verifikation${pendingApprovalCount === 1 ? "" : "er"} väntar på godkännande`}
                                >
                                  {pendingApprovalCount > 99 ? "99+" : pendingApprovalCount}
                                </span>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}

        {/* Bottom items – always visible, no collapsible */}
        <SidebarGroup className="py-0.5 mt-auto pt-3 border-t border-white/5">
          <SidebarMenu>
            {visibleBottomItems.map((item) => { const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={isActive}
                    className={cn(
                      "transition-colors flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] cursor-pointer rounded-lg",
                      isActive && "!text-white !bg-white/[0.06]"
                    )}
                  >
                    <Icon size={16} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-2 border-t border-white/5">
        <GettingStartedChecklist />
        <button
          onClick={() => navigate("/how-it-works")}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
        >
          <Sparkles size={14} strokeWidth={1.5} />
          Hur Ledger.io fungerar
        </button>
        <button
          onClick={() => setCustomizeOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
        >
          <Settings2 size={16} strokeWidth={1.5} />
          Anpassa
        </button>
        <AddCompanyDialog
          trigger={ <button className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-[#3b82f6] hover:underline transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Lägg till företag
            </button>
          }
        />
        {isPlatformAdmin && (
          <button
            onClick={() => navigate(location.pathname === "/admin" ? "/dashboard" : "/admin")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold bg-accent text-accent-foreground"
          >
            <Shield className="h-3.5 w-3.5" />
            {location.pathname === "/admin" ? "Tillbaka till kundvy" : "Växla till Admin"}
          </button>
        )}
        <p className="text-[10px] text-white/15 text-center pb-3 pt-2">
          {tenant ? (tenant.login.footer_attribution || "Powered by Ledger.io") : "Ledger.io © 2026"}
        </p>
      </SidebarFooter>

      <CustomizeModulesModal open={customizeOpen} onOpenChange={setCustomizeOpen} />
    </Sidebar>
  );
};
