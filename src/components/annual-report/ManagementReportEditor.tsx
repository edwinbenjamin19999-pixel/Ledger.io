import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AIFillPlaceholder } from "./AIFillPlaceholder";
import { WordCount } from "./WordCount";

interface ManagementReport { verksamhet: string;
  handelser: string;
  vinstdisposition: string;
  framtid: string;
}

interface KeyFigures { revenue: number;
  ebit: number;
  rörelsemarginal: number;
  balansomslutning: number;
  soliditet: number;
  kassalikviditet: number;
}

interface Props { forvaltning: ManagementReport;
  onForvaltningChange: (f: ManagementReport) => void;
  companyName: string;
  orgNumber: string;
  year: number;
  keyFigures: KeyFigures;
  /** Optional AI-fill handler. Called with the section key, returns the new text. */
  onAIFillSection?: (key: keyof ManagementReport) => Promise<string>;
}

type ManagementReportSection = {
  key: keyof ManagementReport;
  /** DOM id used for scroll-spy / smooth scroll */
  anchorId: string;
  label: string;
  placeholder: string;
};

const fmt = (n: number) => { if (n === 0) return "–";
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
};

const pct = (n: number) => `${n.toFixed(1)}%`;

export const ManagementReportEditor = ({
  forvaltning, onForvaltningChange, companyName, orgNumber, year, keyFigures, onAIFillSection,
}: Props) => {
  const sections: ManagementReportSection[] = [
    { key: "verksamhet", anchorId: "forvaltning_verksamhet",
      label: "Allmänt om verksamheten",
      placeholder: `${companyName} med org.nr ${orgNumber} har sitt säte i [kommun]. Bolaget bedriver verksamhet inom [branschbeskrivning]. Räkenskapsåret avser perioden ${year}-01-01 – ${year}-12-31.`,
    },
    { key: "handelser", anchorId: "forvaltning_handelser",
      label: "Väsentliga händelser under räkenskapsåret",
      placeholder: "Beskriv väsentliga händelser...",
    },
    { key: "vinstdisposition", anchorId: "forvaltning_disposition",
      label: "Förslag till disposition av årets resultat",
      placeholder: "Styrelsen föreslår att till förfogande stående vinstmedel disponeras...",
    },
    { key: "framtid", anchorId: "forvaltning_framtid",
      label: "Framtidsutsikter",
      placeholder: "Beskriv bolagets framtidsutsikter...",
    },
  ];

  const fillSection = async (key: keyof ManagementReport, fallback: string): Promise<string> => {
    const text = onAIFillSection ? await onAIFillSection(key) : fallback;
    onForvaltningChange({ ...forvaltning, [key]: text });
    return text;
  };

  return (
    <div className="space-y-4">
      {sections.map(s => {
        const value = forvaltning[s.key];
        const isEmpty = !value || !value.trim();
        return (
          <Card key={s.key} id={s.anchorId} className="scroll-mt-24">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{s.label}</CardTitle>
              <WordCount text={value || ""} />
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4 space-y-2">
              {isEmpty ? (
                <AIFillPlaceholder
                  label={`Tomt — ${s.label.toLowerCase()}`}
                  onAIFill={() => fillSection(s.key, s.placeholder)}
                  onManual={() => onForvaltningChange({ ...forvaltning, [s.key]: " " })}
                />
              ) : (
                <Textarea
                  value={value}
                  onChange={e => onForvaltningChange({ ...forvaltning, [s.key]: e.target.value })}
                  rows={4}
                  placeholder={s.placeholder}
                  className="text-sm"
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Flerårsöversikt */}
      <Card id="forvaltning_flerarsoverikt" className="scroll-mt-24">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Flerårsöversikt & Nyckeltal</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 text-xs font-medium text-muted-foreground">Nyckeltal</th>
                <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">{year}</th>
                <th className="text-right py-1.5 text-xs font-medium text-muted-foreground">{year - 1}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Nettoomsättning (kr)", value: fmt(keyFigures.revenue), prev: "–" },
                { label: "Rörelseresultat (kr)", value: fmt(keyFigures.ebit), prev: "–" },
                { label: "Rörelsemarginal", value: pct(keyFigures.rörelsemarginal), prev: "–" },
                { label: "Balansomslutning (kr)", value: fmt(keyFigures.balansomslutning), prev: "–" },
                { label: "Soliditet", value: pct(keyFigures.soliditet), prev: "–" },
                { label: "Kassalikviditet", value: pct(keyFigures.kassalikviditet), prev: "–" },
              ].map(r => (
                <tr key={r.label} className="border-b border-border/30">
                  <td className="py-1.5 text-sm">{r.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-sm">{r.value}</td>
                  <td className="py-1.5 text-right tabular-nums text-sm text-muted-foreground">{r.prev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
