import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const roles = [
  { id: "owner",
    label: "Ägare",
    description: "Full tillgång till alla moduler och inställningar. Kan hantera användare och roller.",
    color: "bg-primary text-primary-foreground",
    permissions: ["Alla moduler", "Alla åtgärder", "Hantera användare", "Konfigurera system"],
  },
  { id: "admin",
    label: "Admin",
    description: "Kan konfigurera godkännandeflöden och behörigheter, men inte ändra ägarskap.",
    color: "bg-blue-600 text-white",
    permissions: ["Hantera flöden", "Hantera behörigheter", "Visa alla moduler"],
  },
  { id: "accountant",
    label: "Redovisare",
    description: "Tillgång till bokföring, fakturor, moms och rapporter.",
    color: "bg-green-600 text-white",
    permissions: ["Bokföring", "Fakturor", "Moms", "Rapporter", "Bank"],
  },
  { id: "cfo",
    label: "CFO",
    description: "Ekonomisk översikt, rapporter, budget och finansiell styrning.",
    color: "bg-purple-600 text-white",
    permissions: ["Rapporter", "Budget", "Kassaflöde", "Koncern", "Godkänna betalningar"],
  },
  { id: "payroll",
    label: "Löneansvarig",
    description: "Hantera löner, anställda och arbetsgivardeklarationer.",
    color: "bg-orange-600 text-white",
    permissions: ["Löner", "Anställda", "AGI", "Traktamenten"],
  },
  { id: "project_manager",
    label: "Projektledare",
    description: "Hantera projekt, kostnadsställen och projektredovisning.",
    color: "bg-teal-600 text-white",
    permissions: ["Projekt", "Kostnadsställen", "Projektrapporter"],
  },
  { id: "board_member",
    label: "Styrelseledamot",
    description: "Godkänna företagshändelser, signera protokoll och beslut.",
    color: "bg-slate-700 text-white",
    permissions: ["Företagshändelser", "Signera", "Protokoll", "Beslut"],
  },
  { id: "auditor",
    label: "Revisor",
    description: "Skrivskyddad åtkomst till bokföring, verifikationer och revisionsloggar.",
    color: "bg-amber-600 text-white",
    permissions: ["Visa bokföring", "Visa verifikationer", "Revisionslogg"],
  },
];

export const RoleManagement = () => { return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          Roller och behörigheter
        </CardTitle>
        <CardDescription>
          Översikt över tillgängliga roller och deras standardbehörigheter
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/30 transition-colors"
            >
              <Badge className={`${role.color} mt-0.5 min-w-[100px] justify-center`}>
                {role.label}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{role.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {role.permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
