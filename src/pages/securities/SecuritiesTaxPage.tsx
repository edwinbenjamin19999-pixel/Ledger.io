import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ISKSchablonCalculator } from '@/components/securities/ISKSchablonCalculator';
import { K4Generator } from '@/components/securities/K4Generator';
import { Shield, Info } from 'lucide-react';

export default function SecuritiesTaxPage() {
  return (
    <PageLayout title="Värdepapper">
      <PageHeader
        title="Värdepappersskatt"
        subtitle="ISK schablonskatt · K4 reavinst · KF & Depå AB"
      />

      <Tabs defaultValue="isk">
        <TabsList>
          <TabsTrigger value="isk">ISK Schablon</TabsTrigger>
          <TabsTrigger value="k4">K4 (AF)</TabsTrigger>
          <TabsTrigger value="kf">KF</TabsTrigger>
          <TabsTrigger value="depot_ab">Depå AB</TabsTrigger>
        </TabsList>

        <TabsContent value="isk" className="mt-4">
          <ISKSchablonCalculator />
        </TabsContent>

        <TabsContent value="k4" className="mt-4">
          <K4Generator />
        </TabsContent>

        <TabsContent value="kf" className="mt-4">
          <Card className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-[8px] bg-[#EFF6FF]">
                <Shield className="h-5 w-5 text-[#1E3A5F]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#0F1F3D]">Kapitalförsäkring (KF)</h3>
                <p className="text-sm text-[#64748B] mt-1">
                  Avkastningsskatten för KF beräknas och dras automatiskt av försäkringsbolaget — företaget bokför endast värdet på konto <strong>1385</strong>.
                </p>
              </div>
            </div>
            <div className="rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-[#64748B]" />
                <div>
                  <p className="text-[#0F1F3D]"><strong>Skatteformel (för information):</strong> Kapitalunderlag × max(SLR + 1pp; 1,25%) × 30%</p>
                  <p className="text-[#64748B] mt-1">SLR 30 nov 2024: 2,62% → schablonränta 2025: 3,62%</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="depot_ab" className="mt-4">
          <Card className="rounded-[12px] border-[0.5px] border-[#E2E8F0] bg-white p-6">
            <h3 className="font-semibold mb-3 text-[#0F1F3D]">Depå i Aktiebolag</h3>
            <div className="space-y-3 text-sm">
              <div className="rounded-[8px] border border-[#BFE6D6] p-4 bg-[#E1F5EE]">
                <div className="font-semibold text-[#085041] mb-1">Näringsbetingade andelar</div>
                <p className="text-[#64748B]">
                  Innehav ≥10% i marknadsnoterat bolag <strong>eller</strong> alla onoterade andelar →
                  reavinst & utdelning <strong>skattefria</strong>. Bokförs konto 1350 / 8254.
                </p>
              </div>
              <div className="rounded-[8px] border border-[#F0DDB7] p-4 bg-[#FAEEDA]">
                <div className="font-semibold text-[#7A5417] mb-1">Kapitalplaceringar</div>
                <p className="text-[#64748B]">
                  Marknadsnoterade andelar &lt;10% → beskattas som vanlig bolagsinkomst (20,6%).
                  Bokförs konto 1810 / 8221.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
