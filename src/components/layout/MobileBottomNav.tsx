import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, BookOpen, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { path: "/dashboard", label: "Hem", icon: LayoutDashboard },
  { path: "/invoices", label: "Fakturor", icon: Receipt },
  { path: "/accounting", label: "Bokföring", icon: BookOpen },
  { path: "/reports", label: "Rapporter", icon: BarChart3 },
];

export const MobileBottomNav = () => { const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around items-center py-2 z-40 md:hidden safe-bottom">
      {navItems.map((item) => { const active = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-0.5 rounded-lg px-2 transition-colors",
              active
                ? "text-secondary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={toggleSidebar}
        className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-0.5 rounded-lg px-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span className="text-[10px] font-medium leading-tight">Mer</span>
      </button>
    </nav>
  );
};
