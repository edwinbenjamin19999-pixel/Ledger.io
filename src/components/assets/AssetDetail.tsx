import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { STATUS_LABELS, STATUS_COLORS, CLASS_LABELS, type AssetStatus } from "@/lib/asset-types";
import type { FixedAsset, DepreciationEntry, AssetEvent } from "@/hooks/useAssets";
import { Package, TrendingDown, FileText, History, Calendar, MapPin, User, Hash } from "lucide-react";

interface AssetDetailProps { asset: FixedAsset | null;
  entries: DepreciationEntry[];
  events: AssetEvent[];
  bookValue: number;
  accumulated: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAsset: (id: string, updates: Partial<FixedAsset>) => void;
}

export const AssetDetail = ({ asset, entries, events, bookValue, accumulated, open, onOpenChange, onUpdateAsset }: AssetDetailProps) => { if (!asset) return null;

  const assetEntries = entries.filter(e => e.fixed_asset_id === asset.id).sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());
  const assetEvents = events.filter(e => e.fixed_asset_id === asset.id);
  const depreciable = asset.acquisition_cost - (asset.residual_value || 0);
  const progress = depreciable > 0 ? (accumulated / depreciable) * 100 : 100;
  const status = asset.status as AssetStatus;
  const isFinancial = asset.asset_class === "financial";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{asset.asset_name}</DialogTitle>
            <Badge variant="outline" className={STATUS_COLORS[status]}>
              {STATUS_LABELS[status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {CLASS_LABELS[asset.asset_class]} — {asset.asset_type}
          </p>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="accounting">Kontering</TabsTrigger>
            <TabsTrigger value="depreciation">{isFinancial ? "Värdering" : "Avskrivning"}</TabsTrigger>
            <TabsTrigger value="history">Historik</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Inköpsdatum:</span>
                    <span className="font-medium">{asset.acquisition_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Inköpspris:</span>
                    <span className="font-medium">{asset.acquisition_cost.toLocaleString("sv-SE")} kr</span>
                  </div>
                  {asset.supplier_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Leverantör:</span>
                      <span>{asset.supplier_name}</span>
                    </div>
                  )}
                  {asset.serial_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Serienr:</span>
                      <span>{asset.serial_number}</span>
                    </div>
                  )}
                  {asset.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Plats:</span>
                      <span>{asset.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">Bokfört värde</div>
                  <p className="text-2xl font-bold">{bookValue.toLocaleString("sv-SE")} kr</p>
                  {!isFinancial && (
                    <>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {Math.round(progress)}% avskrivet — {accumulated.toLocaleString("sv-SE")} kr av {depreciable.toLocaleString("sv-SE")} kr
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            {asset.notes && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {asset.notes}
              </div>
            )}
            <div className="flex gap-2">
              {asset.status === "active" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onUpdateAsset(asset.id, { status: "sold" })}>
                    Markera som såld
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onUpdateAsset(asset.id, { status: "scrapped" })}>
                    Utrangera
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="accounting" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Tillgångskonto</span><span>{asset.asset_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avskrivningsmetod</span><span>{asset.depreciation_method}</span></div>
                {!isFinancial && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Nyttjandeperiod</span><span>{asset.useful_life_years} år</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Restvärde</span><span>{(asset.residual_value || 0).toLocaleString("sv-SE")} kr</span></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="depreciation" className="mt-4">
            {assetEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isFinancial ? "Inga värdeförändringar registrerade" : "Inga avskrivningsposter ännu. Kör avskrivning från huvudvyn."}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Avskrivning</TableHead>
                      <TableHead className="text-right">Ackumulerat</TableHead>
                      <TableHead className="text-right">Bokfört värde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetEntries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">{entry.period_start} — {entry.period_end}</TableCell>
                        <TableCell className="text-right text-sm">{entry.depreciation_amount.toLocaleString("sv-SE")} kr</TableCell>
                        <TableCell className="text-right text-sm">{entry.accumulated_depreciation.toLocaleString("sv-SE")} kr</TableCell>
                        <TableCell className="text-right text-sm font-medium">{entry.book_value.toLocaleString("sv-SE")} kr</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {assetEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Ingen historik ännu
              </div>
            ) : (
              <div className="space-y-3">
                {assetEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3 text-sm">
                    <History className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p>{event.description || event.event_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("sv-SE")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
