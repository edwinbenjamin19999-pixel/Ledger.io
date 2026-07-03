import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Receipt, BookOpen, BarChart3, FileCheck, Users, Wallet, Landmark, ArrowLeftRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const navItems = [
  { path: "/accounting", label: "Bokföring", icon: Receipt },
  { path: "/chart-of-accounts", label: "Kontoplan", icon: BookOpen },
  { path: "/account-analysis", label: "Kontoanalys", icon: BarChart3 },
  { path: "/verifications", label: "Verifikationer", icon: FileCheck },
  { path: "/registry", label: "Register", icon: Users },
  { path: "/expenses", label: "Utlägg", icon: Wallet },
  { path: "/bankintegration", label: "Bank", icon: Landmark },
  { path: "/bankavstamning", label: "Avstämning", icon: ArrowLeftRight },
];

export const AccountingSubNav = () => { const navigate = useNavigate();
  const location = useLocation();

  return (
    <ScrollArea className="w-full">
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-2 mb-6 min-w-max">
        {navItems.map(({ path, label, icon: Icon }) => { const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`inline-flex items-center h-[34px] rounded-[8px] px-[12px] text-[12px] font-medium transition-colors ${
                isActive
                  ? "bg-[#0F1F3D] text-white"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
              }`}
            >
              <Icon className="w-4 h-4 mr-1.5" />
              {label}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
