import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AtSign, Check } from "lucide-react";
import { useCollaboration } from "@/hooks/useCollaboration";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export const MentionsList = () => { const { useMentions, markMentionRead } = useCollaboration();
  const { data: mentions = [], isLoading } = useMentions();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AtSign className="h-5 w-5" />
          Omnämningar
          {mentions.length > 0 && (
            <Badge variant="destructive" className="ml-1">{mentions.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Laddar...</p>
        ) : mentions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Inga olästa omnämningar
          </p>
        ) : (
          <div className="space-y-2">
            {mentions.map((mention) => (
              <div key={mention.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">Du omnämndes</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(mention.created_at), "d MMM HH:mm", { locale: sv })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markMentionRead.mutate(mention.id)}
                >
                  <Check className="h-4 w-4 mr-1" /> Markera läst
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
