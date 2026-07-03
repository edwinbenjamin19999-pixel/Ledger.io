import { Card } from '@/components/ui/card';
import { CheckCircle2, ShieldAlert, Wallet, Building2 } from 'lucide-react';
import { ACCOUNT_TYPE_LABEL, type AccountType } from '@/hooks/useSecurities';
import { cn } from '@/lib/utils';

interface Props {
  value?: AccountType;
  onChange: (v: AccountType) => void;
}

const OPTIONS: Array<{
  value: AccountType;
  icon: typeof CheckCircle2;
  legal: 'balance_sheet' | 'tax_only' | 'insurance_wrapper';
  desc: string;
  bookkeeping: string;
}> = [
  {
    value: 'isk',
    icon: Wallet,
    legal: 'tax_only',
    desc: 'Privat investeringssparkonto. Schablonbeskattas — inga reavinster bokförs i AB.',
    bookkeeping: 'Bokförs ej i AB. Rapporteras på K4 om det är privat.',
  },
  {
    value: 'kf',
    icon: ShieldAlert,
    legal: 'insurance_wrapper',
    desc: 'Kapitalförsäkring (försäkringsbolaget äger). I AB bokförs som finansiell tillgång (1385).',
    bookkeeping: '1385 Kapitalförsäkring · 8254 utdelningar (försäkringsbolaget hanterar skatten).',
  },
  {
    value: 'af',
    icon: CheckCircle2,
    legal: 'balance_sheet',
    desc: 'Aktie- & fondkonto / depå. Direkt ägande. Kapitalvinstbeskattas individuellt.',
    bookkeeping: '1810/1350 · 8220 vinst/förlust · 8254 utdelningar · K4-bilaga.',
  },
  {
    value: 'depot_ab',
    icon: Building2,
    legal: 'balance_sheet',
    desc: 'Depå i aktiebolag. Näringsbetingade andelar (>10%) är skattefria vid avyttring.',
    bookkeeping: '1310/1350 · 8350 vinst/förlust · 8254 utdelningar.',
  },
];

export function AccountClassificationGuide({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {OPTIONS.map(o => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <Card
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'p-4 cursor-pointer transition border-2',
              active ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted-foreground/30',
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{ACCOUNT_TYPE_LABEL[o.value]}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{o.desc}</div>
                <div className="text-xs mt-2 px-2 py-1 rounded bg-muted/50 inline-block">
                  📚 {o.bookkeeping}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
