import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyRole } from "./useCompanyRole";

export type AppModule = 
  | "invoices"
  | "bookkeeping"
  | "payroll"
  | "bank"
  | "reports"
  | "tax"
  | "employees"
  | "settings"
  | "consolidation";

export type PermissionLevel = "none" | "view" | "create" | "edit" | "approve" | "full";

interface ModulePermission { module: AppModule;
  permission: PermissionLevel;
}

interface UseModulePermissionResult { permissions: Record<AppModule, PermissionLevel>;
  loading: boolean;
  hasPermission: (module: AppModule, requiredLevel: PermissionLevel) => boolean;
  canView: (module: AppModule) => boolean;
  canCreate: (module: AppModule) => boolean;
  canEdit: (module: AppModule) => boolean;
  canApprove: (module: AppModule) => boolean;
  hasFull: (module: AppModule) => boolean;
}

const permissionHierarchy: Record<PermissionLevel, number> = { none: 0,
  view: 1,
  create: 2,
  edit: 3,
  approve: 4,
  full: 5,
};

export const useModulePermission = (companyId?: string): UseModulePermissionResult => { const { user } = useAuth();
  const { role } = useCompanyRole(companyId);
  const [permissions, setPermissions] = useState<Record<AppModule, PermissionLevel>>({ invoices: "none",
    bookkeeping: "none",
    payroll: "none",
    bank: "none",
    reports: "none",
    tax: "none",
    employees: "none",
    settings: "none",
    consolidation: "none",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user || !companyId) { setLoading(false);
      return;
    }

    // Owners have full access to everything
    if (role === "owner") { setPermissions({ invoices: "full",
        bookkeeping: "full",
        payroll: "full",
        bank: "full",
        reports: "full",
        tax: "full",
        employees: "full",
        settings: "full",
        consolidation: "full",
      });
      setLoading(false);
      return;
    }

    loadPermissions();
  }, [user, companyId, role]);

  const loadPermissions = async () => { if (!user || !companyId) return;

    try { const { data, error } = await supabase
        .from("user_permissions")
        .select("module, permission")
        .eq("user_id", user.id)
        .eq("company_id", companyId);

      if (error) throw error;

      const permMap: Record<AppModule, PermissionLevel> = { invoices: "none",
        bookkeeping: "none",
        payroll: "none",
        bank: "none",
        reports: "none",
        tax: "none",
        employees: "none",
        settings: "none",
        consolidation: "none",
      };

      data?.forEach((p) => { permMap[p.module as AppModule] = p.permission as PermissionLevel;
      });

      setPermissions(permMap);
    } catch (error) { console.error("Error loading permissions:", error);
    } finally { setLoading(false);
    }
  };

  const hasPermission = (module: AppModule, requiredLevel: PermissionLevel): boolean => { const userLevel = permissions[module];
    return permissionHierarchy[userLevel] >= permissionHierarchy[requiredLevel];
  };

  const canView = (module: AppModule) => hasPermission(module, "view");
  const canCreate = (module: AppModule) => hasPermission(module, "create");
  const canEdit = (module: AppModule) => hasPermission(module, "edit");
  const canApprove = (module: AppModule) => hasPermission(module, "approve");
  const hasFull = (module: AppModule) => hasPermission(module, "full");

  return { permissions,
    loading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canApprove,
    hasFull,
  };
};
