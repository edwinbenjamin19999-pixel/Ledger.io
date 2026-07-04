import { useState } from "react";
import { RutRotSettings, useRutRotInvoices, useCustomerLimits, ROT_MAX_PER_PERSON, RUT_MAX_PER_PERSON } from "@/hooks/useRutRot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hammer, Home, Plus, FileText, Users, BarChart3, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { RutRotNewInvoice } from "./RutRotNewInvoice";
import { RutRotInvoiceList } from "./RutRotInvoiceList";
import { RutRotReports } from "./RutRotReports";
import { RutRotCustomerLimits } from "./RutRotCustomerLimits";
import { RutRotAIAdvisor } from "./RutRotAIAdvisor";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export function RutRotDashboard({ settings }: { settings: RutRotSettings }) { const { invoices } = useRutRotInvoices();
  const { limits } = useCustomerLimits();
  const [showNew, setShowNew] = useState(false);

  const totalInvoiced = invoices.reduce((s, i) => s + i.labor_cost + i.material_cost + i.travel_cost, 0);
  const totalDeduction = invoices.reduce((s, i) => s + i.deduction_amount, 0);
  const totalCustomerPays = invoices.reduce((s, i) => s + i.customer_pays, 0);
  const pendingSKV = invoices.filter((i) => i.skv_status === "applied").reduce((s, i) => s + i.deduction_amount, 0);
  const paidSKV = invoices.filter((i) => i.skv_status === "approved").reduce((s, i) => s + (i.skv_paid_amount || i.deduction_amount), 0);

  // Risk zone customers
  const riskCustomers = limits.filter((l) => { const max = l.deduction_type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
    const remaining = max - l.total_used;
    return remaining < 15000 && remaining > 0;
  });

  const fmtDisplay = (n: number) => n === 0 ? "—" : fmt(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings.rot_enabled && <Hammer className="h-6 w-6 text-[#085041]" />}
          {settings.rut_enabled && <Home className="h-6 w-6 text-blue-500" />}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {settings.rut_enabled && settings.rot_enabled ? "RUT/ROT" : settings.rut_enabled ? "RUT" : "ROT"}-avdrag
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Hantera avdrag, ansökningar och kundgränser
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-[#0F1F3D] text-white rounded-xl px-5 py-2.5 font-semibold shadow-sm hover:shadow-md hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Ny RUT/ROT-faktura
        </button>
      </div>

      {/* KPI cards — premium gradient style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-[#0F1F3D] p-5 text-white shadow-md">
          <div className="text-white/70 text-xs uppercase tracking-widest font-medium">Totalt fakturerat</div>
          <div className="text-white font-black text-xl mt-1 tabular-nums">{fmtDisplay(totalInvoiced)}</div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#0F1F3D] p-5 text-white shadow-md">
          <div className="text-white/70 text-xs uppercase tracking-widest font-medium">Avdragsdel (SKV)</div>
          <div className="text-white font-black text-xl mt-1 tabular-nums">{fmtDisplay(totalDeduction)}</div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#0F1F3D] p-5 text-white shadow-md">
          <div className="text-white/70 text-xs uppercase tracking-widest font-medium">Kunddel</div>
          <div className="text-white font-black text-xl mt-1 tabular-nums">{fmtDisplay(totalCustomerPays)}</div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#0F1F3D] p-5 text-white shadow-md">
          <div className="text-white/70 text-xs uppercase tracking-widest font-medium">Väntar från SKV</div>
          <div className="text-white font-black text-xl mt-1 tabular-nums">{fmtDisplay(pendingSKV)}</div>
          {pendingSKV > 0 && <div className="text-white/60 text-xs mt-1">Normalt 3–5 bankdagar</div>}
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#0F1F3D] p-5 text-white shadow-md">
          <div className="text-white/70 text-xs uppercase tracking-widest font-medium">Inbetalt från SKV</div>
          <div className="text-white font-black text-xl mt-1 tabular-nums">{fmtDisplay(paidSKV)}</div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#0F1F3D] p-5 text-white shadow-md">
          <div className="text-white/70 text-xs uppercase tracking-widest font-medium">Gränser i riskzon</div>
          <div className={cn("text-white font-black text-xl mt-1", riskCustomers.length === 0 && "text-white/40")}>
            {riskCustomers.length > 0 ? `${riskCustomers.length} ${riskCustomers.length === 1 ? "kund" : "kunder"}` : "—"}
          </div>
          {riskCustomers.length > 0 && <div className="text-white/60 text-xs mt-1">&lt;15 000 kr kvar</div>}
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        </div>
      </div>

      {/* Risk zone alert */}
      {riskCustomers.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#7A5417] flex-shrink-0" />
            <span className="text-sm font-medium">Kunder nära avdragstaket</span>
          </div>
          {riskCustomers.map((l) => { const max = l.deduction_type === "rot" ? ROT_MAX_PER_PERSON : RUT_MAX_PER_PERSON;
            const remaining = max - l.total_used;
            return (
              <p key={l.id} className="text-xs text-muted-foreground ml-6">
                {l.customer_name || l.customer_personal_id}: {fmt(remaining)} kvar av {fmt(max)} {l.deduction_type.toUpperCase()}-tak
              </p>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="invoices">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-1 inline-flex gap-1">
          <TabsList className="bg-transparent p-0 h-auto">
            <TabsTrigger value="invoices" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:shadow-sm gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Fakturor
            </TabsTrigger>
            <TabsTrigger value="limits" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:shadow-sm gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Kundgränser
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:shadow-sm gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Rapporter
            </TabsTrigger>
            <TabsTrigger value="advisor" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:shadow-sm gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI-rådgivare
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="invoices">
          <RutRotInvoiceList settings={settings} />
        </TabsContent>
        <TabsContent value="limits">
          <RutRotCustomerLimits settings={settings} />
        </TabsContent>
        <TabsContent value="reports">
          <RutRotReports settings={settings} />
        </TabsContent>
        <TabsContent value="advisor">
          <RutRotAIAdvisor settings={settings} />
        </TabsContent>
      </Tabs>

      <RutRotNewInvoice
        open={showNew}
        onOpenChange={setShowNew}
        settings={settings}
      />
    </div>
  );
}
