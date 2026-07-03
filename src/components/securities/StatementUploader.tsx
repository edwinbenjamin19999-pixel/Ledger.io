import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useUploadStatement } from '@/hooks/useSecuritiesStatements';
import { parseStatementPdf } from '@/lib/securities/pdfParser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSecuritiesAccounts } from '@/hooks/useSecurities';
import { Label } from '@/components/ui/label';

interface Props {
  onUploaded?: (statementId: string) => void;
  defaultAccountId?: string;
}

export function StatementUploader({ onUploaded, defaultAccountId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>(defaultAccountId);
  const [statementType, setStatementType] = useState<'annual' | 'transaction' | 'dividend' | 'k4' | 'other'>('annual');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [] } = useSecuritiesAccounts();
  const upload = useUploadStatement();

  async function handleUpload() {
    if (!file) return;
    setProgress(20);
    try {
      const stmt = await upload.mutateAsync({
        file,
        securities_account_id: accountId,
        statement_type: statementType,
      });
      setProgress(60);
      if (stmt.source === 'pdf') {
        setParsing(true);
        await parseStatementPdf({
          statement_id: stmt.id,
          storage_path: stmt.storage_path,
        });
      }
      setProgress(100);
      onUploaded?.(stmt.id);
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        setParsing(false);
      }, 800);
    } catch {
      setProgress(0);
      setParsing(false);
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Depå</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Välj depå (valfritt)" /></SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dokumenttyp</Label>
          <Select value={statementType} onValueChange={(v) => setStatementType(v as typeof statementType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Årsbesked</SelectItem>
              <SelectItem value="transaction">Transaktioner</SelectItem>
              <SelectItem value="dividend">Utdelning</SelectItem>
              <SelectItem value="k4">K4-bilaga</SelectItem>
              <SelectItem value="other">Övrigt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.sru,.txt,application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div className="text-left">
              <div className="font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
            <div className="font-medium">Dra & släpp eller klicka för att välja fil</div>
            <div className="text-xs text-muted-foreground mt-1">PDF (årsbesked) · CSV · SRU</div>
          </>
        )}
      </div>

      {progress > 0 && (
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="text-xs text-muted-foreground text-center">
            {parsing ? 'AI extraherar transaktioner från PDF…' : progress < 100 ? 'Laddar upp…' : 'Klar'}
          </div>
        </div>
      )}

      <Button
        className="w-full"
        disabled={!file || upload.isPending || parsing}
        onClick={handleUpload}
      >
        {upload.isPending || parsing ? 'Bearbetar…' : 'Ladda upp & analysera'}
      </Button>
    </Card>
  );
}
