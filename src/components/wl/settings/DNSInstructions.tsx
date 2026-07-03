import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DNSRecord { type: string; name: string; value: string; }

interface Props { domain: string; verificationToken: string; }

export const DNSInstructions = ({ domain, verificationToken }: Props) => {
  const [copied, setCopied] = useState<string | null>(null);

  const records: DNSRecord[] = [
    { type: "CNAME", name: domain, value: "northledger.se" },
    { type: "TXT", name: `_northledger-verify.${domain}`, value: `northledger-verify=${verificationToken}` },
  ];

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    toast.success("Kopierat");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Lägg till följande DNS-poster hos din domänleverantör. Verifiering kan ta upp till 30 minuter efter att posterna är publicerade.
      </p>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Typ</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Namn</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Värde</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{r.type}</td>
                <td className="px-3 py-2 font-mono text-xs break-all">{r.name}</td>
                <td className="px-3 py-2 font-mono text-xs break-all">{r.value}</td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => copy(r.value, `${i}`)}
                  >
                    {copied === `${i}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Efter verifiering: kontakta support på <a href="mailto:support@northledger.se" className="underline">support@northledger.se</a> för SSL-aktivering på den anpassade domänen.
      </p>
    </div>
  );
};
