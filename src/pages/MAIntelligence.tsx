import { PageHeader } from "@/components/layout/PageHeader";
import { TrendingUp, Search, FileBarChart, Scale, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { toast } from "sonner";

const features = [
  { icon: Search, title: "Target Screening", desc: "AI identifierar relevanta förvärvsmål baserat på din strategi" },
  { icon: FileBarChart, title: "Due Diligence", desc: "Automatiserad genomgång av bokföring, nyckeltal och risker" },
  { icon: Scale, title: "Värderingsmodeller", desc: "DCF, EV/EBITDA och jämförelseanalyser i realtid" },
];

const MAIntelligencePage = () => {
  return (
    <div>
      <PageHeader
        icon={TrendingUp}
        title="M&A Intelligence & Företagsvärdering"
        subtitle="Värdera ditt bolag med fem oberoende metoder och generera due diligence-rapporter"
      />

      {/* Permanent DEMO banner — kan INTE stängas */}
      <div className="max-w-2xl mx-auto px-6 pt-8">
        <div className="rounded-lg border-2 border-red-400 bg-[#FCE8E8] dark:bg-red-950/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#7A1A1A] dark:text-[#C73838] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#7A1A1A] dark:text-red-300">
                ⚠️ DEMO-DATA — M&A Intelligence är under utveckling
              </p>
              <p className="text-xs text-[#7A1A1A] dark:text-[#C73838] mt-1">
                All data som visas är simulerad. Modulen lanseras för Enterprise-kunder Q4 2026.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-3xl bg-[#0F1F3D] flex items-center justify-center mx-auto mb-6 shadow-xl">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">M&A Intelligence</h2>
          <p className="text-muted-foreground text-lg">AI-driven due diligence och förvärvsanalys</p>
          <div className="mt-4">
            <ComingSoonBadge size="md" label="Enterprise — Q4 2026" />
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-10">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-4 p-5 rounded-xl border bg-card">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{f.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-[#EFF6FF] dark:bg-indigo-950/20 border border-[#C8DDF5] dark:border-indigo-800 p-6 text-center">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">
            Tillgängligt för Enterprise-kunder
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-4">
            Kontakta oss för early access och demo
          </p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => toast.success("Tack! Vi kontaktar dig inom kort.")}
          >
            Kontakta säljteam
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MAIntelligencePage;
