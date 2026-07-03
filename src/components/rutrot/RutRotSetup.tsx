import { useState } from "react";
import { useRutRotSettings } from "@/hooks/useRutRot";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Hammer, Sparkles, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = "rut" | "rot" | "both" | null;

export function RutRotSetup() { const { saveSettings } = useRutRotSettings();
  const [choice, setChoice] = useState<Choice>(null);
  const [fSkatt, setFSkatt] = useState(false);
  const [step, setStep] = useState<"choose" | "confirm">("choose");

  const handleChoose = (c: Choice) => { if (c === null) return;
    setChoice(c);
    setStep("confirm");
  };

  const handleSave = () => { if (!fSkatt) return;
    saveSettings.mutate({ rut_enabled: choice === "rut" || choice === "both",
      rot_enabled: choice === "rot" || choice === "both",
      f_skatt_confirmed: true,
      skv_registered_confirmed: true,
    });
  };

  if (step === "choose") { return (
      <div className="max-w-2xl mx-auto py-16 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">RUT/ROT-avdrag</h1>
          <p className="text-muted-foreground">Utför ditt företag RUT eller ROT-arbeten?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer border-2 hover:border-blue-400 transition-colors"
            onClick={() => handleChoose("rut")}
          >
            <CardContent className="p-6 text-center space-y-3">
              <Home className="h-10 w-10 text-blue-500 mx-auto" />
              <p className="font-semibold text-lg">RUT</p>
              <p className="text-sm text-muted-foreground">Städning, hemhjälp, barnpassning</p>
              <p className="text-xs text-blue-600 font-medium">50% avdrag, max 75 000 kr/person/år</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 hover:border-emerald-500 transition-colors"
            onClick={() => handleChoose("rot")}
          >
            <CardContent className="p-6 text-center space-y-3">
              <Hammer className="h-10 w-10 text-[#085041] mx-auto" />
              <p className="font-semibold text-lg">ROT</p>
              <p className="text-sm text-muted-foreground">Bygg, el, VVS, måleri</p>
              <p className="text-xs text-[#085041] font-medium">30% avdrag, max 50 000 kr/person/år</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => handleChoose("both")}>
            Både RUT och ROT
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-16 space-y-6">
      <div className="text-center space-y-2">
        <Sparkles className="h-8 w-8 text-[#3b82f6] mx-auto" />
        <h2 className="text-xl font-bold">Bekräfta registrering</h2>
        <p className="text-sm text-muted-foreground">
          {choice === "both" ? "RUT och ROT" : choice === "rut" ? "RUT" : "ROT"} aktiveras för ditt företag
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="fskatt"
              checked={fSkatt}
              onCheckedChange={(v) => setFSkatt(v === true)}
            />
            <label htmlFor="fskatt" className="text-sm leading-tight cursor-pointer">
              Jag bekräftar att företaget har F-skattsedel och är registrerat för{" "}
              {choice === "both" ? "RUT/ROT" : choice?.toUpperCase()} hos Skatteverket.
            </label>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("choose")} className="flex-1">
              Tillbaka
            </Button>
            <Button
              onClick={handleSave}
              disabled={!fSkatt || saveSettings.isPending}
              className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white"
            >
              {saveSettings.isPending ? "Sparar..." : "Aktivera"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
