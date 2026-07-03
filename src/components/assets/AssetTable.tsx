import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, CLASS_LABELS, type AssetStatus, type AssetClass } from "@/lib/asset-types";
import type { FixedAsset } from "@/hooks/useAssets";

interface AssetTableProps { assets: FixedAsset[];
  getBookValue: (a: FixedAsset) => number;
  getAccumulated: (a: FixedAsset) => number;
  onSelect: (id: string) => void;
  filter: AssetClass | "all";
}

export const AssetTable = ({ assets, getBookValue, getAccumulated, onSelect, filter }: AssetTableProps) => { const filtered = filter === "all" ? assets : assets.filter(a => a.asset_class === filter);

  if (filtered.length === 0) { return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 mb-4">
          <ChevronRight className="h-12 w-12 text-slate-300 dark:text-slate-500" />
        </div>
        <p className="text-slate-500 font-medium mt-4">Inga tillgångar att visa</p>
        <p className="text-sm text-slate-400 mt-1">Lägg till en tillgång eller vänta på att systemet upptäcker en automatiskt</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-right">Anskaffningsvärde</TableHead>
            <TableHead className="text-right">Bokfört värde</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((asset) => { const bookValue = getBookValue(asset);
            const status = asset.status as AssetStatus;
            return (
              <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(asset.id)}>
                <TableCell className="font-medium">{asset.asset_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {CLASS_LABELS[asset.asset_class] || "Materiell"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{asset.asset_type}</TableCell>
                <TableCell className="text-right">{asset.acquisition_cost.toLocaleString("sv-SE")} kr</TableCell>
                <TableCell className="text-right font-medium">{bookValue.toLocaleString("sv-SE")} kr</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] || ""}`}>
                    {STATUS_LABELS[status] || status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
