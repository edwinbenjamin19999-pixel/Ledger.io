import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { ClientSwitcherDropdown } from "@/components/advisor/ClientSwitcherDropdown";

interface AdvisorTopBarProps {
  user: User;
  firmName: string | null;
  firmLogo: string | null;
  criticalCount: number;
}

export const AdvisorTopBar = ({ user, firmName, firmLogo, criticalCount }: AdvisorTopBarProps) => {
  const initials = (user.email || "AD").substring(0, 2).toUpperCase();
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 backdrop-blur-xl"
      style={{
        background: "hsl(var(--brand-primary))",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {firmLogo ? (
          <img src={firmLogo} alt={firmName ?? ""} className="h-7 w-7 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-blue-500 shrink-0" />
        )}
        <ClientSwitcherDropdown variant="mobile" />
      </div>
      <div className="flex items-center gap-2">
        <button
          className="relative h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all"
          aria-label="Aviseringar"
        >
          <Bell className="h-4 w-4" />
          {criticalCount > 0 && (
            <span className={cn(
              "absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500",
              "shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse"
            )} />
          )}
        </button>
        <Avatar className="h-8 w-8 ring-2 ring-white/10">
          <AvatarFallback className="bg-white/10 text-white text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
