import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { completeFortnoxOAuth } from "@/lib/fortnox/fortnoxAuth";
import { Button } from "@/components/ui/button";

export default function FortnoxCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Slutför anslutning till Fortnox…");

  useEffect(() => {
    const code = params.get("code");
    const stateParam = params.get("state");
    const errorParam = params.get("error");

    if (errorParam) {
      setState("error");
      setMessage(params.get("error_description") || errorParam);
      return;
    }
    if (!code || !stateParam) {
      setState("error");
      setMessage("Saknad kod eller state-parameter i återanropet.");
      return;
    }

    completeFortnoxOAuth({ code, state: stateParam })
      .then(() => {
        setState("success");
        setMessage("Ansluten till Fortnox.");
        setTimeout(() => navigate("/migration?fortnox=connected", { replace: true }), 1200);
      })
      .catch((e) => {
        setState("error");
        setMessage(e?.message || "Anslutning misslyckades");
      });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-6">
      <div className="bg-white border-[0.5px] border-[#DFE4EA] rounded-[16px] p-8 max-w-md w-full text-center space-y-4">
        {state === "working" && (
          <Loader2 className="h-8 w-8 text-[#0040CC] mx-auto animate-spin" />
        )}
        {state === "success" && (
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
        )}
        {state === "error" && (
          <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
        )}
        <h1 className="text-base font-semibold text-[#0040CC]">
          {state === "working" ? "Ansluter till Fortnox…" : state === "success" ? "Klart!" : "Något gick fel"}
        </h1>
        <p className="text-[12px] text-[#64748B] leading-relaxed">{message}</p>
        {state === "error" && (
          <Button
            onClick={() => navigate("/migration", { replace: true })}
            className="bg-[#0040CC] hover:bg-[#0040CC]/90 text-[#E6F4FA] rounded-[8px] h-[40px] text-[12px]"
          >
            Tillbaka till migrering
          </Button>
        )}
      </div>
    </div>
  );
}
