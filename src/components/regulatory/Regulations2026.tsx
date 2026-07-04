import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Leaf, BookOpen, Receipt, Wallet, Calculator } from "lucide-react";

const CATEGORY_CONFIG: Record<string, { color: string; icon: any }> = {
  ESG: { color: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]", icon: Leaf },
  Redovisning: { color: "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-[#1E3A5F]", icon: BookOpen },
  Moms: { color: "bg-[#F1F5F9] text-violet-700 dark:bg-violet-900/30 dark:text-[#1E3A5F]", icon: Receipt },
  Lön: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: Wallet },
  Skatt: { color: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]", icon: Calculator },
};

const REGULATIONS_2026 = [
  {
    id: 'csrd-2026',
    title: 'CSRD — Corporate Sustainability Reporting Directive',
    category: 'ESG',
    effectiveDate: '2026-01-01',
    severity: 'high' as const,
    affectsSize: 'Börsnoterade + >500 anst.',
    summary: 'Obligatorisk hållbarhetsrapportering enligt ESRS-standarder.',
    action: 'Samla in ESG-data och implementera rapporteringsprocess.',
    link: 'https://www.bolagsverket.se',
  },
  {
    id: 'bas-2026',
    title: 'BAS 2026 — Uppdaterad kontoplan',
    category: 'Redovisning',
    effectiveDate: '2026-01-01',
    severity: 'medium' as const,
    affectsSize: 'Alla bolag',
    summary: 'Nya och omstrukturerade konton i BAS-kontoplanen för räkenskapsår från 2026.',
    action: 'Kontoplan är uppdaterad i Cogniq AI automatiskt.',
    link: 'https://www.bas.se',
  },
  {
    id: 'moms-oss-2026',
    title: 'OSS — One Stop Shop EU-moms',
    category: 'Moms',
    effectiveDate: '2021-07-01',
    severity: 'high' as const,
    affectsSize: 'E-handelsföretag med EU-försäljning >10 000 EUR',
    summary: 'Tröskel 10 000 EUR för B2C EU-försäljning. OSS-registrering krävs.',
    action: 'Kontrollera din EU B2C-omsättning i E-handelsmodulen.',
    link: 'https://www.skatteverket.se',
  },
  {
    id: 'arbetsgivaravgift-2026',
    title: 'Arbetsgivaravgifter 2026',
    category: 'Lön',
    effectiveDate: '2026-01-01',
    severity: 'low' as const,
    affectsSize: 'Alla arbetsgivare',
    summary: 'Standardavgift 31,42%. Reducerad avgift 10,21% för anställda under 18 eller över 65.',
    action: 'Automatiskt hanterat i lönemodulens beräkningsmotor.',
    link: 'https://www.skatteverket.se',
  },
  {
    id: 'periodiseringsfond-2026',
    title: 'Periodiseringsfonder 2026',
    category: 'Skatt',
    effectiveDate: '2026-01-01',
    severity: 'medium' as const,
    affectsSize: 'Aktiebolag',
    summary: 'Max 25% av beskattningsbar vinst. Schablonränta 1,94% (2026).',
    action: 'Skatteberäkningsmodulen beräknar optimal avsättning automatiskt.',
    link: 'https://www.skatteverket.se',
  },
  {
    id: 'f-skatt-ansokan',
    title: 'F-skatt och preliminärdeklaration',
    category: 'Skatt',
    effectiveDate: '2026-02-01',
    severity: 'medium' as const,
    affectsSize: 'Enskilda firmor och delägare',
    summary: 'Uppdaterade regler för preliminärskatteinbetalningar.',
    action: 'Skatteberäkningsmodulen uppdateras löpande.',
    link: 'https://www.skatteverket.se',
  },
];

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};

export function Regulations2026() {
  const [filter, setFilter] = useState<string>("Alla");
  const categories = ["Alla", ...Object.keys(CATEGORY_CONFIG)];
  const filtered = filter === "Alla" ? REGULATIONS_2026 : REGULATIONS_2026.filter(r => r.category === filter);

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Regulation cards */}
      {filtered.map(reg => {
        const catCfg = CATEGORY_CONFIG[reg.category];
        const CatIcon = catCfg?.icon;
        return (
          <Card key={reg.id}>
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`shrink-0 w-2 h-2 rounded-full mt-2 ${SEVERITY_DOT[reg.severity]}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={catCfg?.color || "bg-muted"} variant="secondary">
                        {CatIcon && <CatIcon className="h-3 w-3 mr-1" />}
                        {reg.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Ikraft: {new Date(reg.effectiveDate).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm">{reg.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{reg.affectsSize}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{reg.summary}</p>

              <div className="bg-[#E1F5EE] dark:bg-emerald-900/10 border border-[#BFE6D6] dark:border-emerald-800 rounded-lg p-3">
                <p className="text-xs font-medium text-[#085041] dark:text-[#1D9E75] mb-0.5">Åtgärd i plattformen:</p>
                <p className="text-xs text-[#085041] dark:text-emerald-300">{reg.action}</p>
              </div>

              <a
                href={reg.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Läs mer <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
