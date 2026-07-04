import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, QrCode, ClipboardCheck } from "lucide-react";
import type { FixedAsset } from "@/hooks/useAssets";

interface AssetVerificationProps { assets: FixedAsset[];
}

export const AssetVerification = ({ assets }: AssetVerificationProps) => { const [verified, setVerified] = useState<Set<string>>(new Set());

  const active = assets.filter(a => a.status === "active");
  const verifiedCount = verified.size;
  const totalCount = active.length;
  const progress = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  const toggleVerify = (id: string) => { setVerified(prev => { const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Tillgångsinventering
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {verifiedCount}/{totalCount} verifierade ({progress}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {active.map(asset => { const isVerified = verified.has(asset.id);
          const assetId = `ANG-${String(asset.id).substring(0, 4).toUpperCase()}`;
          return (
            <div
              key={asset.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${ isVerified ? "bg-[#E1F5EE] dark:bg-emerald-950/20 border-[#BFE6D6] dark:border-emerald-800" : "hover:bg-muted/50"
              }`}
              onClick={() => toggleVerify(asset.id)}
            >
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-[#085041]" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                <div>
                  <span className="font-medium text-xs">{asset.asset_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{assetId}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {asset.location && <span className="text-[10px] text-muted-foreground">{asset.location}</span>}
                <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
