import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePlatformAdmin = () => { const { user } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) { setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }

    const check = async () => { try { const { data, error } = await supabase.rpc("is_platform_admin", { _user_id: user.id,
        });
        setIsPlatformAdmin(!!data && !error);
      } catch { setIsPlatformAdmin(false);
      } finally { setLoading(false);
      }
    };

    check();
  }, [user]);

  return { isPlatformAdmin, loading };
};
