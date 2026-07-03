import { PageHeader } from "@/components/layout/PageHeader";
import { Smartphone, Zap, FileText, BarChart2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { DemoModeBanner } from "@/components/common/DemoModeBanner";
import { toast } from "sonner";

const features = [
  { icon: Zap, title: "Direktbetalning", desc: "Betalning bekräftad på sekunder" },
  { icon: FileText, title: "Auto-bokföring", desc: "Swish-betalningar bokförs automatiskt på konto 3001" },
  { icon: BarChart2, title: "Försäljningsanalys", desc: "Se Swish-omsättning per dag, vecka och produkt" },
  { icon: RefreshCw, title: "Återbetalning", desc: "Enklicks-återbetalning direkt i plattformen" },
];

export default function SwishPage() {
  return (
    <div>
      <PageHeader
        icon={Smartphone}
        title="Swish Business"
        subtitle="Ta emot betalningar, matcha mot fakturor och skicka betalningsförfrågningar"
      />
      <div className="max-w-2xl mx-auto py-8 px-6 space-y-6">
        {/* Permanent demo banner */}
        <DemoModeBanner
          title="Swish Handel — Ej ansluten"
          description="Swish-integrationen kräver ett Swish Handel-avtal via din bank. Data som visas är simulerad. Lansering planeras Q3 2026."
        />

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-3xl bg-[#0F1F3D] flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Swish för Företag</h2>
          <p className="text-muted-foreground text-lg">Ta betalt direkt från kund med Swish Handel</p>
          <div className="mt-4">
            <ComingSoonBadge size="md" label="Integreras Q3 2026" />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {features.map((f) => (
            <div key={f.title} className="p-4 rounded-xl border bg-card">
              <f.icon className="w-5 h-5 text-purple-600 mb-2" />
              <div className="text-sm font-semibold text-foreground">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Interest signup */}
        <div className="rounded-2xl bg-[#F1F5F9] dark:bg-purple-950/20 border border-[#E2E8F0] dark:border-purple-800 p-6 text-center">
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
            Vill du bli notifierad när Swish-integrationen lanseras?
          </p>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => toast.success("Tack! Vi meddelar dig när Swish-integrationen är redo.")}
          >
            Anmäl intresse
          </Button>
        </div>
      </div>
    </div>
  );
}
