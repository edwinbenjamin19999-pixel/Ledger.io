import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface OSSFormProps { companyId: string;
  taxYear: number;
}

const EU_COUNTRIES = [
  { code: "DE", name: "Tyskland", rate: 19 },
  { code: "FR", name: "Frankrike", rate: 20 },
  { code: "NL", name: "Nederländerna", rate: 21 },
  { code: "FI", name: "Finland", rate: 24 },
  { code: "DK", name: "Danmark", rate: 25 },
  { code: "NO", name: "Norge", rate: 25 },
];

export const OSSForm = ({ companyId, taxYear }: OSSFormProps) => { return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Skattedeklarationsagent</span>
        <span>›</span>
        <span className="font-medium text-foreground">OSS/IOSS</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">OSS — One Stop Shop</h2>
          <p className="text-xs text-muted-foreground">EU digital tjänsteförsäljning — moms per land</p>
        </div>
      </div>

      <Card className="border-[#F0DDB7] bg-[#FAEEDA] dark:bg-yellow-950/10">
        <CardContent className="py-3 px-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5" />
          <p className="text-xs text-muted-foreground">
            OSS aktiveras automatiskt om bolaget har EU-försäljning registrerad. 
            AI analyserar fakturor med landsinformation för att fördela moms per EU-land.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moms per EU-land</CardTitle>
          <CardDescription>Baserat på fakturerad försäljning med landsinformation</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium">Land</th>
                <th className="p-2 text-center font-medium">Momssats</th>
                <th className="p-2 text-right font-medium">Försäljning</th>
                <th className="p-2 text-right font-medium">Moms</th>
                <th className="p-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {EU_COUNTRIES.map(c => (
                <tr key={c.code} className="border-b">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2 text-center">{c.rate}%</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">0 kr</td>
                  <td className="p-2 text-right font-mono text-muted-foreground">0 kr</td>
                  <td className="p-2 text-center">
                    <Badge variant="secondary" className="text-xs">Ingen data</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => toast.info("Analyserar EU-försäljning...")}>
        <Globe className="h-4 w-4 mr-2" />
        Analysera EU-försäljning från fakturor
      </Button>
    </div>
  );
};
