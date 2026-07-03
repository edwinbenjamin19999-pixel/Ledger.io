import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface DemoDataBannerProps { moduleName?: string;
}

export const DemoDataBanner = ({ moduleName }: DemoDataBannerProps) => { const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300/50 bg-[#FAEEDA] dark:bg-amber-950/20 dark:border-amber-700/30 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-[#7A5417] dark:text-[#C28A2B] shrink-0" />
      <p className="text-sm text-[#7A5417] dark:text-amber-300 flex-1">
        <span className="font-medium">Exempeldata.</span>{" "}
        {moduleName
          ? `Uppgifterna i ${moduleName} är illustrativa och visar hur modulen fungerar med riktiga data.`
          : "Uppgifterna nedan är illustrativa och visar hur modulen fungerar med riktiga data."}
      </p>
      <button onClick={() => setDismissed(true)} className="text-[#7A5417] dark:text-[#C28A2B] hover:text-[#7A5417] dark:hover:text-amber-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
