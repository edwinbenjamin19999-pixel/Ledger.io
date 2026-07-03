import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Search, Plus, Upload, FolderOpen } from "lucide-react";
import { useState } from "react";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface Document { id: string;
  title: string;
  type: string;
  status: "draft" | "ready" | "signed";
  date: string;
  eventTitle?: string;
}

export const DocumentsTab = () => { const [search, setSearch] = useState("");
  const [documents] = useState<Document[]>([]);

  const statusConfig = { draft: { label: "Utkast", cls: "bg-muted text-muted-foreground" },
    ready: { label: "Klar", cls: "bg-[#EFF6FF] text-blue-600 border-[#C8DDF5]" },
    signed: { label: "Signerad", cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
  };

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Avtal & dokument</h2>
          <p className="text-sm text-muted-foreground">Alla bolagsdokument samlade på ett ställe</p>
        </div>
        <div className="flex gap-2">
          <ComingSoonButton tooltipText="Dokumentuppladdning lanseras snart">Ladda upp</ComingSoonButton>
          <ComingSoonButton tooltipText="Skapa dokument lanseras snart">Nytt dokument</ComingSoonButton>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök dokument..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-medium">Inga dokument</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Dokument skapas automatiskt vid bolagshändelser. Du kan även ladda upp befintliga dokument.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{doc.type}</span>
                      <span>{doc.date}</span>
                      {doc.eventTitle && <span>Kopplad till: {doc.eventTitle}</span>}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={statusConfig[doc.status].cls}>
                  {statusConfig[doc.status].label}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
