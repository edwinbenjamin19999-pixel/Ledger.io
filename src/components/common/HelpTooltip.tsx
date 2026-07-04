import { HelpCircle, Lightbulb, Info } from "lucide-react";
import { Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps { title: string;
  description: string;
  variant?: "help" | "tip" | "info";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
}

export const HelpTooltip = ({ title,
  description,
  variant = "help",
  side = "top",
  className,
  iconClassName,
}: HelpTooltipProps) => { const Icon = variant === "tip" ? Lightbulb : variant === "info" ? Info : HelpCircle;
  
  const iconColors = { help: "text-muted-foreground hover:text-primary",
    tip: "text-[#7A5417] hover:text-[#C28A2B]",
    info: "text-blue-500 hover:text-[#1E3A5F]",
  };

  const bgColors = { help: "bg-popover",
    tip: "bg-[#FAEEDA] dark:bg-yellow-950/50 border-[#F0DDB7] dark:border-yellow-800",
    info: "bg-[#EFF6FF] dark:bg-blue-950/50 border-[#C8DDF5] dark:border-blue-800",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              className
            )}
          >
            <Icon className={cn("h-4 w-4 cursor-help", iconColors[variant], iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className={cn(
            "max-w-xs p-4 shadow-lg",
            bgColors[variant]
          )}
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Pre-configured tooltips för common use cases
export const BookkeepingHelp = () => (
  <HelpTooltip
    variant="tip"
    title="AI Bokföring - Så funkar det"
    description="Beskriv ditt köp eller försäljning med vanlig svenska. AI:n förstår och skapar verifikatet åt dig. Du kan även fota kvitton direkt!"
  />
);

export const InvoiceHelp = () => (
  <HelpTooltip
    variant="info"
    title="Skapa faktura"
    description="Fyll i kunduppgifter och artiklar. AI:n hjälper dig med momsberäkning och bokföring automatiskt när fakturan skickas."
  />
);

export const ReportHelp = () => (
  <HelpTooltip
    variant="info"
    title="Rapporter & Analyser"
    description="Här ser du resultaträkning, balansräkning och andra viktiga nyckeltal. Allt uppdateras i realtid baserat på din bokföring."
  />
);

export const BankHelp = () => (
  <HelpTooltip
    variant="info"
    title="Bankkoppling"
    description="Koppla ditt bankkonto så hämtas transaktioner automatiskt. AI:n matchar och bokför dem åt dig."
  />
);

export const MigrationHelp = () => (
  <HelpTooltip
    variant="tip"
    title="Migrera från annat system"
    description="Exportera en SIE-fil från ditt gamla bokföringsprogram (Fortnox, Visma, etc.) och ladda upp här. All data importeras automatiskt."
  />
);

export const VATHelp = () => (
  <HelpTooltip
    variant="info"
    title="Momsrapport"
    description="Här sammanställs din moms automatiskt. När du är redo kan du skicka deklarationen direkt till Skatteverket."
  />
);

export const HRHelp = () => (
  <HelpTooltip
    variant="info"
    title="HR & Löner"
    description="Hantera anställda, kör lön och skicka AGI-deklarationer till Skatteverket. Allt bokförs automatiskt."
  />
);
