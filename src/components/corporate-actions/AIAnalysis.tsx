import { ActionType, ACTION_TEMPLATES } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, AlertTriangle, Info, Sparkles, ShieldAlert } from "lucide-react";

interface AIAnalysisProps { actionType: ActionType;
  formData: Record<string, string>;
}

const getAnalysis = (type: ActionType, data: Record<string, string>) => { const checks: { status: "ok" | "warning" | "info" | "danger"; message: string; detail?: string }[] = [];

  switch (type) { case "unconditional_contribution":
      checks.push({ status: "ok",
        message: "Ovillkorat aktieägartillskott stärker bolagets egna kapital permanent.",
        detail: "Bokförs mot konto 2083 (Erhållna aktieägartillskott). Påverkar fritt eget kapital positivt.",
      });
      if (Number(data.amount) > 500000) { checks.push({ status: "info",
          message: `Stort belopp (${Number(data.amount).toLocaleString("sv-SE")} kr). Säkerställ att tillskottsgivaren har dokumentation och likviditet.`,
        });
      }
      checks.push({ status: "info",
        message: "Tillskottet kan inte återkrävas. Om ni vill ha möjlighet till återbetalning, använd villkorat tillskott istället.",
      });
      break;

    case "conditional_contribution":
      checks.push({ status: "ok",
        message: "Villkorat aktieägartillskott ger rätt till återbetalning när fritt eget kapital medger det.",
        detail: "Bokförs mot konto 2093 (Erhållet villkorat aktieägartillskott). Prioritet vid likvidation: efter aktiekapital men före ovillkorade tillskott.",
      });
      checks.push({ status: "warning",
        message: "Skriftligt avtal är obligatoriskt. Utan avtal riskerar tillskottet att betraktas som ovillkorat.",
      });
      break;

    case "shareholder_loan_in":
      checks.push({ status: "ok", message: "Lån från aktieägare till bolaget är fullt tillåtet." });
      checks.push({ status: "info",
        message: "Räntan bör vara marknadsmässig. Ränteintäkten beskattas hos aktieägaren med 30 % kapitalskatt.",
        detail: "Räntan är avdragsgill för bolaget som räntekostnad.",
      });
      if (Number(data.interest_rate) > 10) { checks.push({ status: "warning",
          message: "Hög ränta kan ifrågasättas av Skatteverket om den inte anses marknadsmässig.",
        });
      }
      if (Number(data.interest_rate) === 0) { checks.push({ status: "info",
          message: "Räntefritt lån är tillåtet men kan vid vissa situationer leda till skattemässiga frågor kring underprisöverlåtelse.",
        });
      }
      break;

    case "shareholder_loan_out":
      checks.push({ status: "danger",
        message: "Lån från bolaget till aktieägare är normalt FÖRBJUDET enligt ABL 21 kap. (låneförbudet).",
        detail: "Förbjudna lån beskattas som inkomst av tjänst och kan medföra skattetillägg på 40 %. Undantag: koncernlån och kommersiella lån.",
      });
      checks.push({ status: "warning",
        message: "Säkerställ att det finns en tydlig laglig grund (undantag) innan ni genomför detta.",
      });
      break;

    case "dividend_proposal":
      checks.push({ status: "ok", message: "Styrelsens utdelningsförslag måste baseras på senast fastställda årsredovisning." });
      checks.push({ status: "warning",
        message: "Kontrollera att beloppet ryms inom utdelningsbara medel. Försiktighetsregeln i ABL 17:3 måste beaktas.",
      });
      break;

    case "dividend_agm":
      checks.push({ status: "ok", message: "Utdelning beslutas av bolagsstämman baserat på senast fastställda årsredovisning." });
      checks.push({ status: "warning",
        message: "Säkerställ att utdelningen ryms inom fritt eget kapital. ABL 17:3 (försiktighetsregeln) gäller.",
      });
      checks.push({ status: "info",
        message: "3:12-reglerna (K10) avgör beskattningen — utdelning inom gränsbeloppet beskattas med 20 %, överskjutande som tjänst.",
        detail: "Kontrollera gränsbeloppet i K10-blanketten innan beslut fattas.",
      });
      if (Number(data.total_amount) > 200000) { checks.push({ status: "warning",
          message: "Kontrollera att utdelningen inte överstiger gränsbeloppet för att undvika tjänstebeskattning.",
        });
      }
      break;

    case "new_share_issue":
      checks.push({ status: "ok", message: "Nyemission kräver beslut av bolagsstämma och registrering hos Bolagsverket." });
      if (Number(data.price_per_share) > Number(data.quota_value || 0)) { checks.push({ status: "info",
          message: `Överkurs: ${(Number(data.price_per_share) - Number(data.quota_value || 0)).toLocaleString("sv-SE")} kr per aktie bokförs på konto 2084 (Överkursfond).`,
        });
      }
      checks.push({ status: "info",
        message: "Betalning ska ske senast på den tidpunkt som anges i emissionsbeslutet. Registrering ska ske inom 6 månader.",
      });
      break;

    case "bonus_issue":
      checks.push({ status: "ok", message: "Fondemission ökar aktiekapitalet utan att nya pengar tillförs." });
      checks.push({ status: "info",
        message: "Överföring sker från fritt till bundet eget kapital. Registreras hos Bolagsverket.",
      });
      break;

    case "board_resolution":
      checks.push({ status: "ok", message: "Beslutsförhet kräver att mer än hälften av ledamöterna är närvarande." });
      checks.push({ status: "info",
        message: "Protokollet bör numreras löpande och förvaras i ordnad form enligt ABL 8:24.",
      });
      break;

    case "agm":
      checks.push({ status: "ok",
        message: "Ordinarie bolagsstämma ska hållas inom 6 månader från räkenskapsårets slut.",
      });
      checks.push({ status: "info",
        message: "Obligatoriska ärenden: fastställelse av BR/RR, vinstdisposition, ansvarsfrihet, val av styrelse/revisor.",
      });
      if (data.board_discharge === "no") { checks.push({ status: "warning",
          message: "Nekad ansvarsfrihet öppnar möjlighet för skadeståndstalan mot styrelseledamöter.",
        });
      }
      break;

    case "extra_meeting":
      checks.push({ status: "ok", message: "Extra bolagsstämma kan hållas när som helst." });
      checks.push({ status: "info",
        message: "Kallelse ska ske enligt bolagsordningen. Normalt 1-4 veckors kallelsetid.",
      });
      break;

    case "board_change":
      checks.push({ status: "ok", message: "Styrelseändring ska registreras hos Bolagsverket." });
      checks.push({ status: "info",
        message: "Ändringsanmälan kostar 1 000 kr. Anmälan ska göras utan dröjsmål.",
      });
      break;

    case "signatory_change":
      checks.push({ status: "ok", message: "Ändring av firmateckningsrätt registreras hos Bolagsverket." });
      break;

    case "revers":
      checks.push({ status: "ok", message: "Skuldebrev dokumenterar låneförhållandet formellt." });
      checks.push({ status: "info",
        message: "Räntan bör vara marknadsmässig. Ett räntefritt skuldebrev kan ifrågasättas skattemässigt.",
      });
      break;

    case "internal_agreement":
      checks.push({ status: "warning",
        message: "Avtal med närstående granskas särskilt av Skatteverket. Dokumentera affärsmässigheten.",
        detail: "Ej marknadsmässiga villkor kan klassas som förtäckt utdelning.",
      });
      break;

    case "loan_repayment":
      checks.push({ status: "ok", message: "Återbetalning av aktieägarlån minskar bolagets skuld." });
      break;

    case "loan_interest":
      checks.push({ status: "ok", message: "Ränta på aktieägarlån är avdragsgill för bolaget." });
      checks.push({ status: "info",
        message: "Räntan ska vara marknadsmässig och ska deklareras som kapitalinkomst av långivaren.",
      });
      break;
  }

  return checks;
};

export const AIAnalysis = ({ actionType, formData }: AIAnalysisProps) => { const analysis = getAnalysis(actionType, formData);
  const template = ACTION_TEMPLATES[actionType];

  const statusIcon = { ok: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
    danger: ShieldAlert,
  };

  const statusColors = { ok: "border-[#BFE6D6] dark:border-emerald-700",
    warning: "border-[#F0DDB7] dark:border-amber-700",
    info: "border-blue-300 dark:border-blue-700",
    danger: "border-destructive",
  };

  const iconColors = { ok: "text-[#085041]",
    warning: "text-[#7A5417]",
    info: "text-blue-600",
    danger: "text-destructive",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">AI-analys: {template.label}</h3>
          <p className="text-sm text-muted-foreground">
            Automatisk juridisk och skattemässig bedömning
          </p>
        </div>
      </div>

      {/* Risk level */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Risknivå:</span>
        <Badge variant={template.riskLevel === "high" ? "destructive" : "secondary"} className="text-xs">
          {template.riskLevel === "high" ? "Hög" : template.riskLevel === "medium" ? "Medel" : "Låg"}
        </Badge>
        {template.requiresSigning && (
          <Badge variant="outline" className="text-xs gap-1">
            BankID krävs
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {analysis.map((check, i) => { const Icon = statusIcon[check.status];
          return (
            <Card key={i} className={statusColors[check.status]}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColors[check.status]}`} />
                  <div className="space-y-1">
                    <p className="text-sm">{check.message}</p>
                    {check.detail && (
                      <p className="text-xs text-muted-foreground">{check.detail}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground flex items-start gap-2">
        <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          Denna analys är genererad av NorthLedger:s juridiska motor baserat på ABL, IL och aktuell praxis.
          Den ersätter inte professionell juridisk rådgivning vid komplexa situationer.
        </p>
      </div>
    </div>
  );
};
