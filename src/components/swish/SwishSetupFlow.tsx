import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Upload, AlertCircle } from "lucide-react";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface SwishSetupFlowProps { onSetup: (data: { connectionType: string; merchantNumber?: string; bankName?: string }) => Promise<void>;
}

export function SwishSetupFlow({ onSetup }: SwishSetupFlowProps) { const [step, setStep] = useState<"choose" | "merchant" | "manual">("choose");
  const [merchantNumber, setMerchantNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleMerchantSetup = async () => { if (!merchantNumber || !bankName) return;
    setSaving(true);
    await onSetup({ connectionType: "merchant", merchantNumber, bankName });
    setSaving(false);
  };

  const handleManualSetup = async () => { setSaving(true);
    await onSetup({ connectionType: "manual" });
    setSaving(false);
  };

  if (step === "choose") { return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Har du Swish Handel / Swish Företag?</h2>
          <p className="text-muted-foreground">Välj hur du vill koppla Swish till NorthLedger</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-[#41B5AC] transition-colors"
            onClick={() => setStep("merchant")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#41B5AC20" }}>
                <Smartphone className="h-6 w-6" style={{ color: "#41B5AC" }} />
              </div>
              <CardTitle className="text-lg">Ja, anslut</CardTitle>
              <CardDescription>
                Jag har Swish Handel eller Swish Företag via min bank. Anslut för automatisk matchning.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStep("manual")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Nej, manuellt läge</CardTitle>
              <CardDescription>
                Jag använder bara privat Swish. Registrera betalningar manuellt för avstämning.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "manual") { return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Manuellt Swish-läge</CardTitle>
            <CardDescription>
              Du kan registrera Swish-betalningar manuellt och matcha dem mot fakturor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              I manuellt läge registrerar du inkommande Swish-betalningar och kopplar dem till fakturor.
              NorthLedger skapar automatiskt verifikationer vid matchning.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("choose")}>Tillbaka</Button>
              <Button onClick={handleManualSetup} disabled={saving}>
                {saving ? "Sparar..." : "Aktivera manuellt läge"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Anslut Swish Handel</CardTitle>
          <CardDescription>
            Ange ditt Swish-handelsnummer och välj din bank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merchantNumber">Swish-handelsnummer</Label>
            <Input
              id="merchantNumber"
              placeholder="123 456 7890"
              value={merchantNumber}
              onChange={(e) => setMerchantNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bank</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger>
                <SelectValue placeholder="Välj din bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Swedbank">Swedbank</SelectItem>
                <SelectItem value="SEB">SEB</SelectItem>
                <SelectItem value="Handelsbanken">Handelsbanken</SelectItem>
                <SelectItem value="Nordea">Nordea</SelectItem>
                <SelectItem value="Danske Bank">Danske Bank</SelectItem>
                <SelectItem value="Länsförsäkringar">Länsförsäkringar</SelectItem>
                <SelectItem value="Sparbanken">Sparbanken</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-[#F0DDB7] bg-[#FAEEDA] dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-[#7A5417] dark:text-[#C28A2B]" />
              <div className="text-sm">
                <p className="font-medium text-[#7A5417] dark:text-amber-300">Certifikat krävs</p>
                <p className="text-[#7A5417] dark:text-[#C28A2B]">
                  Swish Handel använder certifikatbaserad autentisering.
                  Ladda ner ditt handelscertifikat från din banks företagstjänst och ladda upp det här.
                </p>
              </div>
            </div>
            <ComingSoonButton tooltipText="Certifikatuppladdning aktiveras i kommande version" className="ml-6">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Ladda upp certifikat
            </ComingSoonButton>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("choose")}>Tillbaka</Button>
            <Button
              onClick={handleMerchantSetup}
              disabled={!merchantNumber || !bankName || saving}
            >
              {saving ? "Sparar..." : "Spara anslutning"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
