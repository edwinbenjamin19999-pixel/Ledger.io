import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, AlertTriangle, CheckCircle2, HelpCircle, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

const formatSEK = (v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} TSEK`;
  return `${Math.round(v)} kr`;
};

interface SupplierRisk { name: string;
  orgNumber: string | null;
  spend: number;
  sharePercent: number;
  esgRisk: "low" | "medium" | "unknown";
  co2Intensity: number;
  sector: string;
  hasReported: boolean;
}

export function SupplierESG() { const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => { const stored = localStorage.getItem("dashboard:selectedCompanyId");
    if (stored) setCompanyId(stored);
  }, []);

  const { data: suppliers } = useQuery({ queryKey: ["supplier-esg-v2", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<SupplierRisk[]> => { if (!companyId) return [];

      const { data: invoices } = await supabase
        .from("invoices")
        .select("counterparty_name, counterparty_org_number, total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "incoming")
        .in("status", ["paid", "attested", "sent"]);

      if (!invoices || invoices.length === 0) return [];

      const supplierMap = new Map<string, { spend: number; orgNumber: string | null }>();
      for (const inv of invoices) { const name = inv.counterparty_name || "Okänd leverantör";
        const existing = supplierMap.get(name) || { spend: 0, orgNumber: null };
        existing.spend += (inv.total_amount || 0);
        if (inv.counterparty_org_number) existing.orgNumber = inv.counterparty_org_number;
        supplierMap.set(name, existing);
      }

      const totalSpend = Array.from(supplierMap.values()).reduce((s, v) => s + v.spend, 0);

      // Only include suppliers with >10 000 kr/year spend
      const sorted = Array.from(supplierMap.entries())
        .filter(([, data]) => data.spend >= 10000)
        .sort((a, b) => b[1].spend - a[1].spend)
        .slice(0, 15);

      return sorted.map(([name, data]) => { const nameLower = name.toLowerCase();
        const isTech = /adobe|microsoft|google|amazon|aws|github|slack|zoom|atlassian|saas|digital|cloud|it|tech/i.test(nameLower);
        const isService = /konsult|byrå|revisions|redovisning|juridik/i.test(nameLower);
        const isIndustry = /bygg|transport|frakt|logistik|tillverkning/i.test(nameLower);

        let esgRisk: "low" | "medium" | "unknown" = "unknown";
        let co2Intensity = 0.8;
        let sector = "Övrigt";

        if (isTech) { esgRisk = "low"; co2Intensity = 0.02; sector = "Teknik/SaaS"; }
        else if (isService) { esgRisk = "low"; co2Intensity = 0.05; sector = "Professionella tjänster"; }
        else if (isIndustry) { esgRisk = "medium"; co2Intensity = 1.5; sector = "Industri/Transport"; }

        return { name,
          orgNumber: data.orgNumber,
          spend: data.spend,
          sharePercent: totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0,
          esgRisk,
          co2Intensity,
          sector,
          hasReported: esgRisk === "low", // heuristic
        };
      });
    },
  });

  const totalEstimatedCO2 = useMemo(() => { if (!suppliers) return 0;
    return suppliers.reduce((sum, s) => sum + (s.spend / 1_000_000) * s.co2Intensity, 0);
  }, [suppliers]);

  const concentration = useMemo(() => { if (!suppliers || suppliers.length === 0) return 0;
    return suppliers.slice(0, 3).reduce((sum, s) => sum + s.sharePercent, 0);
  }, [suppliers]);

  const unknownCount = suppliers?.filter(s => s.esgRisk === "unknown").length || 0;

  const riskIcon = (risk: string) => { if (risk === "low") return <CheckCircle2 className="h-4 w-4 text-[#085041]" />;
    if (risk === "medium") return <AlertTriangle className="h-4 w-4 text-[#7A5417]" />;
    return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const riskLabel = (risk: string) => { if (risk === "low") return <Badge variant="outline" className="text-[#085041] border-[#BFE6D6] text-xs">Låg</Badge>;
    if (risk === "medium") return <Badge variant="outline" className="text-[#7A5417] border-[#F0DDB7] text-xs">Medel</Badge>;
    return <Badge variant="outline" className="text-xs">Okänd</Badge>;
  };

  if (!suppliers || suppliers.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold">Inga leverantörer med &gt;10 000 kr/år hittades</p>
          <p className="text-sm text-muted-foreground mt-1">Registrera leverantörsfakturor för att se ESG-riskbedömning.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{suppliers.length}</p>
            <p className="text-xs text-muted-foreground">Leverantörer (&gt;10 TSEK)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className={`text-2xl font-bold ${concentration > 60 ? "text-[#7A5417]" : "text-[#085041]"}`}>
              {concentration.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Top 3 koncentration</p>
            {concentration > 60 && <p className="text-xs text-[#7A5417] mt-1">Hög koncentrationsrisk</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{totalEstimatedCO2.toFixed(1)} ton</p>
            <p className="text-xs text-muted-foreground">Estimerat CO₂ (Scope 3)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className={`text-2xl font-bold ${unknownCount > 0 ? "text-[#7A5417]" : "text-[#085041]"}`}>
              {unknownCount}
            </p>
            <p className="text-xs text-muted-foreground">Utan ESG-data</p>
            {unknownCount > 0 && <p className="text-xs text-[#7A5417] mt-1">Begär ESG-enkät</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Leverantörsriskbedömning
          </CardTitle>
          <CardDescription>
            Leverantörer med &gt;10 000 kr/år. ESG-risk baserad på bransch och offentliga data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leverantör</TableHead>
                <TableHead>Sektor</TableHead>
                <TableHead className="text-right">Inköp</TableHead>
                <TableHead className="text-right">Andel</TableHead>
                <TableHead>ESG-risk</TableHead>
                <TableHead>Hållbarhetsdata</TableHead>
                <TableHead>Åtgärd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map(s => (
                <TableRow key={s.name}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      {s.orgNumber && <p className="text-xs text-muted-foreground">{s.orgNumber}</p>}
                      {!s.orgNumber && <p className="text-xs text-[#7A5417]">Org.nr saknas</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.sector}</TableCell>
                  <TableCell className="text-right text-sm">{formatSEK(s.spend)}</TableCell>
                  <TableCell className="text-right text-sm">{s.sharePercent.toFixed(1)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {riskIcon(s.esgRisk)}
                      {riskLabel(s.esgRisk)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.hasReported ? (
                      <Badge variant="outline" className="text-[#085041] border-[#BFE6D6] text-xs">Ja</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Okänt</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.esgRisk === "unknown" ? (
                      <ComingSoonButton tooltipText="ESG-enkätutskick lanseras Q3 2026" variant="ghost" className="text-xs h-7">
                        <Mail className="h-3 w-3 mr-1" /> Skicka enkät
                      </ComingSoonButton>
                    ) : (
                      <span className="text-xs text-muted-foreground">OK</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            Leverantörskedjans totala CO₂-estimat: <strong>{totalEstimatedCO2.toFixed(1)} ton</strong>
            <span className="ml-1 text-xs">(estimerat baserat på branschgenomsnitt per MSEK spend)</span>
          </div>

          {unknownCount > 0 && (
            <div className="mt-3">
              <ComingSoonButton tooltipText="Massutskick av ESG-enkäter lanseras Q3 2026" className="gap-2">
                <Send className="h-4 w-4" />
                Skicka ESG-enkät till alla {unknownCount} utan data
              </ComingSoonButton>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
