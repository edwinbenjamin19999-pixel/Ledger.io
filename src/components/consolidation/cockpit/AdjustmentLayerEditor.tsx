import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { useConsolidationAdjustments } from '@/hooks/useConsolidationAdjustments';
import { formatSEK } from '@/lib/formatNumber';
import { cn } from '@/lib/utils';

interface Props {
  periodId: string;
  companies: Array<{ id: string; name: string }>;
}

const ADJUSTMENT_TYPES = [
  { value: 'goodwill', label: 'Goodwill' },
  { value: 'fair_value', label: 'Fair value / Övervärde' },
  { value: 'nci', label: 'Minoritetsintresse (NCI)' },
  { value: 'reclassification', label: 'Omklassificering' },
  { value: 'fx_translation', label: 'FX-omräkning' },
  { value: 'unrealized_profit', label: 'Orealiserad vinst' },
  { value: 'group_correction', label: 'Koncernkorrigering' },
  { value: 'manual_override', label: 'Manuell override' },
];

export function AdjustmentLayerEditor({ periodId, companies }: Props) {
  const { create } = useConsolidationAdjustments(periodId);
  const [type, setType] = useState('manual_override');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { line_no: 1, company_id: null as string | null, account_no: '', account_name: '', debit: 0, credit: 0, description: '' },
    { line_no: 2, company_id: null as string | null, account_no: '', account_name: '', debit: 0, credit: 0, description: '' },
  ]);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.01;

  const updateLine = (idx: number, patch: any) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const addLine = () => setLines(prev => [...prev, { line_no: prev.length + 1, company_id: null, account_no: '', account_name: '', debit: 0, credit: 0, description: '' }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!balanced || !description) return;
    await create.mutateAsync({
      adjustment_type: type,
      description,
      affected_company_ids: Array.from(new Set(lines.map(l => l.company_id).filter(Boolean) as string[])),
      lines: lines.filter(l => l.account_no),
    });
    setDescription('');
    setLines([
      { line_no: 1, company_id: null, account_no: '', account_name: '', debit: 0, credit: 0, description: '' },
      { line_no: 2, company_id: null, account_no: '', account_name: '', debit: 0, credit: 0, description: '' },
    ]);
  };

  return (
    <Card className="bg-white border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Manuell koncernjustering</h3>
          <p className="text-xs text-slate-500 mt-0.5">Skapas i adjustment-lagret. Bolagens grundbokföring rörs aldrig.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Typ</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ADJUSTMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Förklaring</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="t.ex. Övervärde maskiner enligt förvärvsanalys" className="h-9" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden mb-3">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[10px] uppercase tracking-wide text-slate-500">
              <th className="text-left px-3 py-2 font-medium">Bolag</th>
              <th className="text-left px-3 py-2 font-medium">Konto</th>
              <th className="text-left px-3 py-2 font-medium">Kontonamn</th>
              <th className="text-right px-3 py-2 font-medium w-32">Debet</th>
              <th className="text-right px-3 py-2 font-medium w-32">Kredit</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-1.5">
                  <Select value={line.company_id ?? 'group'} onValueChange={v => updateLine(idx, { company_id: v === 'group' ? null : v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Koncern</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Input value={line.account_no} onChange={e => updateLine(idx, { account_no: e.target.value })} placeholder="1010" className="h-8 text-xs" />
                </td>
                <td className="px-2 py-1.5">
                  <Input value={line.account_name} onChange={e => updateLine(idx, { account_name: e.target.value })} placeholder="Goodwill" className="h-8 text-xs" />
                </td>
                <td className="px-2 py-1.5">
                  <Input type="number" value={line.debit || ''} onChange={e => updateLine(idx, { debit: Number(e.target.value) })} className="h-8 text-xs text-right tabular-nums" />
                </td>
                <td className="px-2 py-1.5">
                  <Input type="number" value={line.credit || ''} onChange={e => updateLine(idx, { credit: Number(e.target.value) })} className="h-8 text-xs text-right tabular-nums" />
                </td>
                <td className="px-1">
                  <Button size="sm" variant="ghost" onClick={() => removeLine(idx)} className="h-7 w-7 p-0">
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr className="text-xs font-semibold">
              <td colSpan={3} className="px-3 py-2 text-right text-slate-600">Summa</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatSEK(totalDebit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatSEK(totalCredit)}</td>
              <td></td>
            </tr>
            {!balanced && (
              <tr>
                <td colSpan={6} className="px-3 py-1.5 text-[11px] text-[#7A1A1A] font-medium bg-[#FCE8E8] text-center">
                  Differens: {formatSEK(diff)} — debet och kredit måste balansera
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={addLine}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Lägg till rad
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!balanced || !description || create.isPending}
          className={cn('bg-[#3b82f6] hover:bg-[#3b82f6] text-white', balanced && 'shadow-[0_0_12px_rgba(0,82,255,0.3)]')}
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {create.isPending ? 'Sparar…' : 'Spara justering'}
        </Button>
      </div>
    </Card>
  );
}
