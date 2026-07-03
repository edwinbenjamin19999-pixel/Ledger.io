import { AlertTriangle } from "lucide-react";

interface DemoModeBannerProps {
  title: string;
  description: string;
  contact?: string;
}

/**
 * Permanent (non-dismissable) demo-mode banner for modules
 * that require external integrations not yet active.
 */
export const DemoModeBanner = ({ title, description, contact = "support@northledger.se" }: DemoModeBannerProps) => {
  return (
    <div className="rounded-lg border-2 border-amber-400 bg-[#FAEEDA] dark:bg-amber-950/30 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[#7A5417] dark:text-[#C28A2B] shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#7A5417] dark:text-amber-300">
            {title}
          </p>
          <p className="text-xs text-[#7A5417] dark:text-[#C28A2B] mt-1">
            {description}
          </p>
          <p className="text-xs text-[#7A5417] dark:text-[#7A5417] mt-1">
            Kontakt: <span className="font-medium">{contact}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
