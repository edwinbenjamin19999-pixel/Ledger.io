import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = 'owner' | 'accountant' | 'auditor' | 'cfo';

interface CompanyRole { role: UserRole | null;
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  isOwnerOrAccountant: boolean;
  isAuditor: boolean;
}

export const useCompanyRole = (companyId?: string): CompanyRole => { const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user || !companyId) { setLoading(false);
      return;
    }

    loadRole();
  }, [user, companyId]);

  const loadRole = async () => { if (!user || !companyId) return;

    try { const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      setRole(data?.role as UserRole || null);
    } catch (error) { console.error('Error loading role:', error);
      setRole(null);
    } finally { setLoading(false);
    }
  };

  const hasRole = (checkRole: UserRole): boolean => { return role === checkRole;
  };

  const isOwnerOrAccountant = role === 'owner' || role === 'accountant';
  const isAuditor = role === 'auditor';

  return { role,
    loading,
    hasRole,
    isOwnerOrAccountant,
    isAuditor,
  };
};
