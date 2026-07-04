import { ActionType, ACTION_TEMPLATES } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AccountingPreviewProps { actionType: ActionType;
  formData: Record<string, string>;
}

export const AccountingPreview = ({ actionType, formData }: AccountingPreviewProps) => { const template = ACTION_TEMPLATES[actionType];

  if (template.accounts.length === 0) { return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Bokföring</h3>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-sm">
              Denna händelse kräver ingen bokföring — endast dokumentation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDetailedEntries = () => { const entries: { description: string; debit: string; debitName: string; credit: string; creditName: string; amount: number }[] = [];

    switch (actionType) { case "unconditional_contribution": { const amount = Number(formData.amount || 0);
        entries.push({ description: "Ovillkorat aktieägartillskott",
          debit: "1930", debitName: "Företagskonto",
          credit: "2083", creditName: "Erhållna aktieägartillskott",
          amount,
        });
        break;
      }
      case "conditional_contribution": { const amount = Number(formData.amount || 0);
        entries.push({ description: "Villkorat aktieägartillskott",
          debit: "1930", debitName: "Företagskonto",
          credit: "2093", creditName: "Erhållet villkorat aktieägartillskott",
          amount,
        });
        break;
      }
      case "shareholder_loan_in": { const amount = Number(formData.amount || 0);
        entries.push({ description: "Lån från aktieägare",
          debit: "1930", debitName: "Företagskonto",
          credit: "2393", creditName: "Lån från närstående",
          amount,
        });
        break;
      }
      case "shareholder_loan_out": { const amount = Number(formData.amount || 0);
        entries.push({ description: "Lån till aktieägare",
          debit: "1380", debitName: "Andra långfristiga fordringar",
          credit: "1930", creditName: "Företagskonto",
          amount,
        });
        break;
      }
      case "loan_repayment": { const amount = Number(formData.amount || 0);
        entries.push({ description: "Återbetalning aktieägarlån",
          debit: "2393", debitName: "Lån från närstående",
          credit: "1930", creditName: "Företagskonto",
          amount,
        });
        break;
      }
      case "loan_interest": { const amount = Number(formData.interest_amount || 0);
        entries.push({ description: "Räntekostnad aktieägarlån",
          debit: "8410", debitName: "Räntekostnader",
          credit: "2960", creditName: "Upplupna räntekostnader",
          amount,
        });
        break;
      }
      case "dividend_agm": { const amount = Number(formData.total_amount || 0);
        entries.push({ description: "Utdelningsbeslut (skuld till aktieägare)",
          debit: "2091", debitName: "Balanserat resultat",
          credit: "2898", creditName: "Outtagen utdelning",
          amount,
        });
        entries.push({ description: "Utbetalning av utdelning",
          debit: "2898", debitName: "Outtagen utdelning",
          credit: "1930", creditName: "Företagskonto",
          amount,
        });
        break;
      }
      case "new_share_issue": { const numShares = Number(formData.num_shares || 0);
        const quotaValue = Number(formData.quota_value || 0);
        const pricePerShare = Number(formData.price_per_share || 0);
        const totalAmount = numShares * pricePerShare;
        const aktiekapital = numShares * quotaValue;
        const overkurs = totalAmount - aktiekapital;

        entries.push({ description: "Nyemission — aktiekapital",
          debit: "1930", debitName: "Företagskonto",
          credit: "2081", creditName: "Aktiekapital",
          amount: aktiekapital,
        });
        if (overkurs > 0) { entries.push({ description: "Nyemission — överkursfond",
            debit: "1930", debitName: "Företagskonto",
            credit: "2084", creditName: "Överkursfond",
            amount: overkurs,
          });
        }
        break;
      }
      case "bonus_issue": { const amount = Number(formData.amount || 0);
        const sourceAccount = formData.source === "share_premium" ? "2084" : "2091";
        const sourceName = formData.source === "share_premium" ? "Överkursfond" : "Balanserat resultat";
        entries.push({ description: "Fondemission",
          debit: sourceAccount, debitName: sourceName,
          credit: "2081", creditName: "Aktiekapital",
          amount,
        });
        break;
      }
      default:
        // Use template accounts as fallback
        template.accounts.forEach(acc => { entries.push({ description: acc.description,
            debit: acc.debit, debitName: acc.debitName,
            credit: acc.credit, creditName: acc.creditName,
            amount: Number(formData[acc.amountField] || 0),
          });
        });
        break;
    }

    return entries;
  };

  const entries = getDetailedEntries();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Calculator className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-lg">Bokföringsförslag</h3>
          <p className="text-sm text-muted-foreground">
            Verifikationer som skapas automatiskt
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {entries.map((entry, i) => (
          <Card key={i} className="border-[#BFE6D6] dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                  <span className="font-medium text-sm">{entry.description}</span>
                </div>
                <Badge className="bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]">
                  {entry.amount.toLocaleString("sv-SE")} kr
                </Badge>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center bg-muted p-3 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Debet</div>
                  <div className="font-mono text-sm font-semibold">{entry.debit}</div>
                  <div className="text-xs text-muted-foreground">{entry.debitName}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Kredit</div>
                  <div className="font-mono text-sm font-semibold">{entry.credit}</div>
                  <div className="text-xs text-muted-foreground">{entry.creditName}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {entries.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Verifikationerna skapas med status "utkast" och kräver godkännande innan de bokförs i huvudboken.
        </p>
      )}
    </div>
  );
};
