import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { ClientSwitcherDropdown } from "./ClientSwitcherDropdown";
import { BureauSyncIndicator } from "./BureauSyncIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  user: User;
  firmName: string | null;
  firmLogo: string | null;
  onSignOut: () => void;
}

export const AdvisorTopBar = ({ user, firmName, firmLogo, onSignOut }: Props) => {
  const initials = (user.email || "AD").substring(0, 2).toUpperCase();
  return (
    <header
      className="sticky top-0 z-40 h-16 flex items-center justify-between px-5 gap-4 text-white"
      style={{
        background: "hsl(var(--brand-primary))",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10" />
        <div className="flex items-center gap-2.5 min-w-0">
          {firmLogo ? (
            <img
              src={firmLogo}
              alt={firmName ?? ""}
              className="h-8 w-8 rounded-lg object-contain bg-white p-0.5"
              style={{ border: "1px solid hsl(var(--brand-primary) / 0.2)" }}
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "hsl(var(--brand-primary))" }}
            >
              {(firmName ?? "AD").substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/70">
              Advisor
            </div>
            <div className="text-sm font-semibold truncate text-white">
              {firmName ?? "Byrå"}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <BureauSyncIndicator />
        <ClientSwitcherDropdown variant="desktop" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/10 text-white">
              <Avatar className="h-9 w-9">
                <AvatarFallback
                  className="text-xs font-bold text-white"
                  style={{ background: "hsl(var(--brand-primary))" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-[#0F172A]">Mitt konto</p>
                <p className="text-xs text-[#64748B]">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-[#7A1A1A] focus:bg-[#FCE8E8] focus:text-[#7A1A1A]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
