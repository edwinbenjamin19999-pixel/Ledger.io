import { Building2, ChevronRight, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Company { id: string;
  name: string;
  org_number: string;
  currency: string;
}

interface GroupTreeProps { groupName: string;
  groupCurrency: string;
  companies: Company[];
}

export const GroupTree = ({ groupName, groupCurrency, companies }: GroupTreeProps) => { const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Parent Group */}
          <div
            className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-primary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-primary" />
            )}
            <Building2 className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <p className="font-bold text-lg">{groupName}</p>
              <p className="text-sm text-muted-foreground">
                Koncernmoderbolag • {groupCurrency}
              </p>
            </div>
            <Badge variant="secondary">
              {companies.length} dotterbolag
            </Badge>
          </div>

          {/* Child Companies */}
          {isExpanded && (
            <div className="ml-8 space-y-2 border-l-2 border-primary/30 pl-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {company.org_number} • {company.currency}
                    </p>
                  </div>
                  {company.currency !== groupCurrency && (
                    <Badge variant="outline" className="text-xs">
                      Omräknas till {groupCurrency}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
