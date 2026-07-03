import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateISKSchablon } from '@/lib/securities/iskSchablon';
import { formatSEK } from '@/lib/formatNumber';
import { Calculator } from 'lucide-react';

export function ISKSchablonCalculator() {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [q1, setQ1] = useState('100000');
  const [q2, setQ2] = useState('110000');
  const [q3, setQ3] = useState('115000');
  const [q4, setQ4] = useState('120000');
  const [deposits, setDeposits] = useState('0');

  const result = useMemo(() => calculateISKSchablon({
    q1: parseFloat(q1) || 0,
    q2: parseFloat(q2) || 0,
    q3: parseFloat(q3) || 0,
    q4: parseFloat(q4) || 0,
    deposits: parseFloat(deposits) || 0,
  }, taxYear), [q1, q2, q3, q4, deposits, taxYear]);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-[#EFF6FF] dark:bg-cyan-950/40">
          <Calculator className="h-5 w-5 text-[#3b82f6] dark:text-[#3b82f6]" />
        </div>
        <div>
          <h3 className="font-semibold">ISK Schablonskatt</h3>
          <p className="text-xs text-muted-foreground">Beräkna årets schablonintäkt och skatt</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <Label className="text-xs">Beskattningsår</Label>
          <Input type="number" value={taxYear} onChange={e => setTaxYear(parseInt(e.target.value))} />
        </div>
        <div>
          <Label className="text-xs">Värde 1 jan</Label>
          <Input type="number" value={q1} onChange={e => setQ1(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Värde 1 apr</Label>
          <Input type="number" value={q2} onChange={e => setQ2(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Värde 1 jul</Label>
          <Input type="number" value={q3} onChange={e => setQ3(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Värde 1 okt</Label>
          <Input type="number" value={q4} onChange={e => setQ4(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Insättningar under året</Label>
          <Input type="number" value={deposits} onChange={e => setDeposits(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Kapitalunderlag</span>
          <span className="tabular-nums font-medium">{formatSEK(result.capitalBase)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Schablonränta {result.floorApplied && <Badge variant="secondary" className="ml-1 text-[10px]">Golv 1,25%</Badge>}
          </span>
          <span className="tabular-nums font-medium">{(result.schablonRate * 100).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Schablonintäkt</span>
          <span className="tabular-nums font-medium">{formatSEK(result.schablonIncome)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="font-semibold">Skatt (30%)</span>
          <span className="tabular-nums font-bold text-[#3b82f6] dark:text-[#3b82f6]">{formatSEK(result.taxAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          SLR 30 nov {taxYear - 1}: {(result.slrUsed * 100).toFixed(2)}% · Bokförs konto 1630 (skattekonto) mot 8423.
        </p>
      </div>
    </Card>
  );
}
