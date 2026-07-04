import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => { const [status, setStatus] = useState<Status>("loading");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  useEffect(() => { if (!token) { setStatus("invalid");
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then((r) => r.json())
      .then((data) => { if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already_unsubscribed");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleUnsubscribe = async () => { if (!token) return;
    try { const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already_unsubscribed");
      else setStatus("error");
    } catch { setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Avprenumerera</h1>

        {status === "loading" && <p className="text-muted-foreground">Laddar...</p>}

        {status === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">
              Klicka nedan för att avprenumerera från framtida mejl från Cogniq.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Bekräfta avprenumeration
            </button>
          </>
        )}

        {status === "success" && (
          <p className="text-[#085041] font-medium">✅ Du har avprenumererats. Du kommer inte få fler mejl från oss.</p>
        )}

        {status === "already_unsubscribed" && (
          <p className="text-muted-foreground">Du har redan avprenumererats.</p>
        )}

        {status === "invalid" && (
          <p className="text-destructive">Ogiltig eller utgången länk.</p>
        )}

        {status === "error" && (
          <p className="text-destructive">Något gick fel. Försök igen senare.</p>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
