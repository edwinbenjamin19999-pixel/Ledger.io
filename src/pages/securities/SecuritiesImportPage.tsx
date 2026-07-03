import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Upload, Edit3, ExternalLink } from 'lucide-react';
import { StatementUploader } from '@/components/securities/StatementUploader';
import { ImportFromBrokerDialog } from '@/components/securities/ImportFromBrokerDialog';
import { AddTransactionDialog } from '@/components/securities/AddTransactionDialog';

const BROKER_LINKS: Array<{ name: string; url: string; tip: string }> = [
  { name: 'Nordnet', url: 'https://www.nordnet.se/login', tip: 'Mina sidor → Depå → Transaktioner → Exportera CSV' },
  { name: 'Avanza', url: 'https://www.avanza.se/min-ekonomi/transaktioner', tip: 'Min ekonomi → Transaktioner → Exportera' },
  { name: 'SEB', url: 'https://seb.se', tip: 'Logga in → Värdepapper → Årsbesked (PDF)' },
  { name: 'Handelsbanken', url: 'https://handelsbanken.se', tip: 'Logga in → Sparande → Värdepapper → Årsbesked' },
  { name: 'Swedbank', url: 'https://swedbank.se', tip: 'Logga in → Sparande → SRU/PDF' },
];

export default function SecuritiesImportPage() {
  const navigate = useNavigate();
  return (
    <PageLayout title="Importera värdepapper">
      <Button variant="ghost" size="sm" onClick={() => navigate('/securities')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
      </Button>
      <PageHeader
        title="Importera värdepapper"
        subtitle="Ladda upp PDF-årsbesked, CSV/SRU eller registrera manuellt"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vänster kolumn - upload */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Ladda upp källdokument</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              PDF-årsbesked analyseras med AI. CSV/SRU parsas direkt. Alla dokument arkiveras med spårbarhet.
            </p>
            <StatementUploader onUploaded={() => navigate('/securities/statements')} />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Snabbimport (Nordnet/Avanza/SRU)</h2>
            </div>
            <ImportFromBrokerDialog />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Manuell registrering</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Registrera enskilda transaktioner — köp, sälj, utdelning, avgift, etc.
            </p>
            <AddTransactionDialog />
          </Card>
        </div>

        {/* Höger kolumn - hämta från institution */}
        <Card className="p-4 h-fit">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Hämta från institution</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Logga in hos din bank/broker, ladda ner export, dra in filen ovan. Ingen BankID-kostnad för dig.
          </p>
          <div className="space-y-2">
            {BROKER_LINKS.map(b => (
              <div key={b.name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{b.name}</span>
                  <a href={b.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      Öppna <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </a>
                </div>
                <div className="text-xs text-muted-foreground">{b.tip}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
