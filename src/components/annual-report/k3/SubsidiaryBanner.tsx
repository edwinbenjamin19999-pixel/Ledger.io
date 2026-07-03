import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  hasSubsidiaries: boolean;
  subsidiaryCount?: number;
}

export default function SubsidiaryBanner({ hasSubsidiaries, subsidiaryCount = 0 }: Props) {
  if (!hasSubsidiaries) return null;

  return (
    <div className="space-y-3">
      <Card className="border-purple-300 bg-purple-50/60">
        <CardContent className="p-4 flex items-start gap-3">
          <Building2 className="h-5 w-5 text-purple-700 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">Detta bolag har dotterbolag</h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px]">K3</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {subsidiaryCount > 0 ? `${subsidiaryCount} dotterbolag registrerade. ` : ""}
              K3 kräver att moderbolaget upprättar koncernredovisning utöver moderbolagets egen årsredovisning.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/consolidation">Öppna koncernmodulen <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 text-xs space-y-1">
            <h4 className="font-semibold text-sm mb-1">Krav för koncernredovisning enligt K3</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Koncernresultaträkning</li>
              <li>• Koncernbalansräkning</li>
              <li>• Eliminering av interna transaktioner och mellanhavanden</li>
              <li>• Goodwill-beräkning och årlig nedskrivningsprövning</li>
              <li>• Minoritetsintresse (NCI)</li>
              <li>• Kassaflödesanalys för koncernen</li>
            </ul>
            <p className="pt-2 text-foreground">
              <strong>OBS:</strong> Moderbolaget ska upprätta sin egen årsredovisning ("Moderbolagets årsredovisning") parallellt med "Koncernredovisningen".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
