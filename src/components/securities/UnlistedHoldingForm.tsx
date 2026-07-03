import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSecuritiesAccounts } from '@/hooks/useSecurities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function UnlistedHoldingForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [name, setName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [ownership, setOwnership] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionValue, setAcquisitionValue] = useState('');
  const [valuation, setValuation] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { data: accounts = [] } = useSecuritiesAccounts();

  const depotAccounts = accounts.filter(a => a.account_type === 'depot_ab' || a.account_type === 'af');

  async function submit() {
    const companyId = localStorage.getItem('selectedCompanyId');
    if (!companyId) return toast.error('Inget bolag valt');
    if (!name) return toast.error('Bolagsnamn krävs');
    if (!accountId) return toast.error('Välj depå');

    setSubmitting(true);
    try {
      const ownershipPct = ownership ? Number(ownership) : null;
      const isNaringsbetingad = (ownershipPct ?? 0) >= 10;

      const { data: holding, error } = await supabase
        .from('securities_holdings')
        .insert({
          company_id: companyId,
          securities_account_id: accountId,
          name,
          ticker: orgNumber || null,
          isin: null,
          quantity: 1,
          avg_cost: acquisitionValue ? Number(acquisitionValue) : 0,
          current_value: valuation ? Number(valuation) : (acquisitionValue ? Number(acquisitionValue) : 0),
          is_unlisted: true,
          is_naringsbetingad: isNaringsbetingad,
          acquisition_date: acquisitionDate || null,
          ownership_percentage: ownershipPct,
          manual_valuation: valuation ? Number(valuation) : null,
          valuation_date: valuation ? new Date().toISOString().slice(0, 10) : null,
        } as never)
        .select()
        .single();
      if (error) throw error;

      // Upload attachments
      const userId = (await supabase.auth.getUser()).data.user?.id;
      for (const f of files) {
        const path = `${companyId}/${holding.id}/${Date.now()}_${f.name.replace(/[^\w.\-]+/g, '_')}`;
        const { error: upErr } = await supabase.storage
          .from('securities-documents')
          .upload(path, f);
        if (upErr) throw upErr;
        await supabase.from('securities_documents').insert({
          company_id: companyId,
          holding_id: holding.id,
          file_name: f.name,
          storage_path: path,
          document_type: 'other',
          uploaded_by: userId,
          notes: notes || null,
        } as never);
      }

      qc.invalidateQueries({ queryKey: ['securities_holdings'] });
      toast.success(`Onoterat innehav skapat${isNaringsbetingad ? ' (märkt som näringsbetingad)' : ''}`);
      setOpen(false);
      setName(''); setOrgNumber(''); setOwnership(''); setAcquisitionDate('');
      setAcquisitionValue(''); setValuation(''); setNotes(''); setFiles([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel';
      toast.error(`Kunde inte spara: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Lägg till onoterat innehav
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Onoterat innehav
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Depå *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Välj AF eller Depå AB" /></SelectTrigger>
              <SelectContent>
                {depotAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bolagsnamn *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Holding AB" />
            </div>
            <div>
              <Label>Org.nr</Label>
              <Input value={orgNumber} onChange={e => setOrgNumber(e.target.value)} placeholder="556789-1234" />
            </div>
            <div>
              <Label>Ägarandel (%)</Label>
              <Input type="number" value={ownership} onChange={e => setOwnership(e.target.value)} placeholder="10" />
              <div className="text-xs text-muted-foreground mt-1">≥10% → automatiskt näringsbetingad</div>
            </div>
            <div>
              <Label>Förvärvsdatum</Label>
              <Input type="date" value={acquisitionDate} onChange={e => setAcquisitionDate(e.target.value)} />
            </div>
            <div>
              <Label>Anskaffningsvärde (kr)</Label>
              <Input type="number" value={acquisitionValue} onChange={e => setAcquisitionValue(e.target.value)} />
            </div>
            <div>
              <Label>Aktuell värdering (kr)</Label>
              <Input type="number" value={valuation} onChange={e => setValuation(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Noteringar</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Värderingsmetod, källa, referenser…" />
          </div>
          <div>
            <Label>Bilagor (avtal, certifikat, värderingsunderlag)</Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/40"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                onChange={e => setFiles(Array.from(e.target.files ?? []))}
              />
              <Upload className="h-6 w-6 mx-auto text-muted-foreground/60 mb-1" />
              <div className="text-sm">
                {files.length > 0 ? `${files.length} fil(er) valda` : 'Klicka för att välja filer'}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Sparar…' : 'Spara innehav'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
