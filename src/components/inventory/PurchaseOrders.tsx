import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, ShoppingCart } from "lucide-react";

interface PO { id: string;
  orderNr: string;
  supplier: string;
  lines: number;
  total: number;
  status: "draft" | "sent" | "confirmed" | "received" | "invoiced";
  deliveryDate: string;
}

const statusConfig: Record<PO["status"], { label: string; cls: string }> = { draft: { label: "Utkast", cls: "bg-muted text-muted-foreground" },
  sent: { label: "Skickad", cls: "bg-[#EFF6FF] text-blue-600 border-[#C8DDF5]" },
  confirmed: { label: "Bekräftad", cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
  received: { label: "Mottagen", cls: "bg-[#F1F5F9] text-violet-600 border-[#E2E8F0]" },
  invoiced: { label: "Fakturerad", cls: "bg-muted text-muted-foreground" },
};

export const PurchaseOrders = () => { const [orders] = useState<PO[]>([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Inköpsordrar</h3>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ny inköpsorder</Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">Inga inköpsordrar</p>
            <p className="text-sm mt-1">Skapa en inköpsorder för att börja hantera inköp.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordernr</TableHead>
                  <TableHead>Leverantör</TableHead>
                  <TableHead className="text-right">Rader</TableHead>
                  <TableHead className="text-right">Totalt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leverans</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs">{po.orderNr}</TableCell>
                    <TableCell className="font-medium">{po.supplier}</TableCell>
                    <TableCell className="text-right">{po.lines}</TableCell>
                    <TableCell className="text-right font-medium">{po.total.toLocaleString("sv-SE")} kr</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[po.status].cls}>
                        {statusConfig[po.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{po.deliveryDate}</TableCell>
                    <TableCell>
                      {po.status === "confirmed" && (
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          <Package className="h-3 w-3 mr-1" /> Registrera inleverans
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
