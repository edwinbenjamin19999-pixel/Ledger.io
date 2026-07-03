import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Download, Trash2, Upload } from 'lucide-react';
import { useSecuritiesStatements, useDeleteStatement, getStatementSignedUrl, type SecuritiesStatement } from '@/hooks/useSecuritiesStatements';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const TYPE_LABEL: Record<string, string> = {
  annual: 'Årsbesked',
  transaction: 'Transaktioner',
  dividend: 'Utdelning',
  k4: 'K4-bilaga',
  other: 'Övrigt',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  parsing: 'secondary',
  parsed: 'default',
  failed: 'destructive',
  reviewed: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Väntar',
  parsing: 'Analyserar…',
  parsed: 'Analyserad',
  failed: 'Misslyckades',
  reviewed: 'Granskad',
};

export default function SecuritiesStatementsPage() {
  const navigate = useNavigate();
  const { data: statements = [], isLoading } = useSecuritiesStatements();
  const del = useDeleteStatement();

  async function handleDownload(s: SecuritiesStatement) {
    const url = await getStatementSignedUrl(s.storage_path);
    if (!url) return toast.error('Kunde inte skapa nedladdningslänk');
    window.open(url, '_blank');
  }

  return (
    <PageLayout title="Källdokument">
      <Button variant="ghost" size="sm" onClick={() => navigate('/securities')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
      </Button>
      <PageHeader
        title="Källdokument"
        subtitle="Arkiv över uppladdade årsbesked, transaktionsfiler och K4-bilagor"
        actions={
          <Button onClick={() => navigate('/securities/import')}>
            <Upload className="h-4 w-4 mr-2" /> Ladda upp nytt
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : statements.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold mb-1">Inga källdokument än</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ladda upp ditt första årsbesked eller transaktionsfil.
          </p>
          <Button onClick={() => navigate('/securities/import')}>
            <Upload className="h-4 w-4 mr-2" /> Ladda upp
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="p-3 text-left">Filnamn</th>
                  <th className="p-3 text-left">Typ</th>
                  <th className="p-3 text-left">Källa</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Extraherade rader</th>
                  <th className="p-3 text-left">Uppladdad</th>
                  <th className="p-3 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {statements.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{s.file_name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{TYPE_LABEL[s.statement_type] ?? s.statement_type}</Badge>
                    </td>
                    <td className="p-3 uppercase text-xs">{s.source}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANT[s.parse_status] ?? 'outline'}>
                        {STATUS_LABEL[s.parse_status] ?? s.parse_status}
                      </Badge>
                      {s.parse_confidence != null && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {Math.round(Number(s.parse_confidence) * 100)}%
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{s.extracted_count ?? 0}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(s.uploaded_at).toLocaleString('sv-SE')}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(s)} title="Ladda ner">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Ta bort ${s.file_name}?`)) del.mutate(s);
                          }}
                          title="Ta bort"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
