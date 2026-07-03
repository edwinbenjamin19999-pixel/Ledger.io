import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

interface EventDetailProps { eventId: string;
  onBack: () => void;
}

export const EventDetail = ({ eventId, onBack }: EventDetailProps) => { // In production, fetch event data from the database by eventId
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">Händelsen kunde inte hittas</p>
          <p className="text-sm mt-1">Denna händelse finns inte i systemet.</p>
        </CardContent>
      </Card>
    </div>
  );
};
