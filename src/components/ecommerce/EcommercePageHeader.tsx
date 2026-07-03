import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EcommercePageHeaderProps { icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  actionDisabled?: boolean;
  children?: ReactNode;
}

export const EcommercePageHeader = ({ icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  actionDisabled,
  children,
}: EcommercePageHeaderProps) => { return (
    <div className="flex items-start justify-between mb-8">
      <div className="flex items-start">
        <div className="w-8 h-8 p-1.5 rounded-xl bg-[#0F1F3D] text-white mr-3 flex items-center justify-center shrink-0">
          <Icon className="w-full h-full" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        <Button
          onClick={onAction}
          disabled={actionDisabled}
          className="bg-[#0F1F3D] hover:from-teal-600 hover:to-emerald-700 text-white border-0 gap-2"
        >
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {actionLabel}
        </Button>
      </div>
    </div>
  );
};
