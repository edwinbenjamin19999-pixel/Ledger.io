import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2 } from 'lucide-react';
import { UnlistedHoldingForm } from '@/components/securities/UnlistedHoldingForm';
import { useSecuritiesHoldings } from '@/hooks/useSecurities';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(Number(n));

export default function SecuritiesUnlistedPage() {
  const navigate = useNavigate();
  const { data: all = [], isLoading } = useSecuritiesHoldings();
  const unlisted = all.filter(h => (h as { is_unlisted?: boolean }).is_unlisted);

  const totalValue = unlisted.reduce((s, h) => s + Number(h.current_value ?? 0), 0);
  const totalCost = unlisted.reduce((s, h) => s + Number(h.avg_cost ?? 0) * Number(h.quantity ?? 0), 0);

  return (
    <PageLayout title="Onoterade innehav">
      <Button variant="ghost" size="sm" onClick={() => navigate('/securities')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
      </Button>
      <PageHeader
        title="Onoterade innehav"
        subtitle="Aktier i privata bolag, dotterbolag och andra onoterade andelar"
        actions={<UnlistedHoldingForm />}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Antal innehav</div>
          <div className="text-2xl font-bold">{unlisted.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Anskaffningsvärde</div>
          <div className="text-2xl font-bold">{fmt(totalCost)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Bokfört värde</div>
          <div className="text-2xl font-bold">{fmt(totalValue)}</div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : unlisted.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold mb-1">Inga onoterade innehav</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Lägg till andelar i dotterbolag eller privata bolag med dokumentbilagor och näringsbetingad-flagga.
          </p>
          <UnlistedHoldingForm />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="p-3 text-left">Bolag</th>
                  <th className="p-3 text-left">Org.nr</th>
                  <th className="p-3 text-right">Ägarandel</th>
                  <th className="p-3 text-left">Förvärv</th>
                  <th className="p-3 text-right">Anskaffning</th>
                  <th className="p-3 text-right">Värdering</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {unlisted.map(h => {
                  const ext = h as typeof h & {
                    is_naringsbetingad?: boolean;
                    ownership_percentage?: number | null;
                    acquisition_date?: string | null;
                    manual_valuation?: number | null;
                  };
                  return (
                    <tr key={h.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{h.name}</td>
                      <td className="p-3 text-muted-foreground">{h.ticker ?? '—'}</td>
                      <td className="p-3 text-right">{ext.ownership_percentage ?? '—'}{ext.ownership_percentage != null ? '%' : ''}</td>
                      <td className="p-3">{ext.acquisition_date ?? '—'}</td>
                      <td className="p-3 text-right tabular-nums">{fmt(Number(h.avg_cost) * Number(h.quantity))}</td>
                      <td className="p-3 text-right tabular-nums">{fmt(ext.manual_valuation ?? Number(h.current_value))}</td>
                      <td className="p-3">
                        {ext.is_naringsbetingad && (
                          <Badge variant="default">Näringsbetingad</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
