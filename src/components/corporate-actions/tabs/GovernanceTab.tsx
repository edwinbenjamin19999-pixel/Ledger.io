import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, PenTool, CheckCircle2, Clock, Gavel } from "lucide-react";

interface BoardMember { id: string;
  name: string;
  role: "chairman" | "member" | "deputy" | "ceo";
  since: string;
}

interface PendingSigning { id: string;
  title: string;
  signers: { name: string; initials: string; status: "signed" | "pending" }[];
}

const roleLabels: Record<string, string> = { chairman: "Ordförande",
  member: "Ledamot",
  deputy: "Suppleant",
  ceo: "VD",
};

export const GovernanceTab = () => { const [board, setBoard] = useState<BoardMember[]>([]);
  const [pendingSignings] = useState<PendingSigning[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("member");

  const handleAdd = () => { if (!newName) return;
    setBoard(prev => [...prev, { id: crypto.randomUUID(),
      name: newName,
      role: newRole as BoardMember["role"],
      since: new Date().toISOString().slice(0, 10),
    }]);
    setNewName("");
    setNewRole("member");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Styrelse & beslut</h2>
          <p className="text-sm text-muted-foreground">Hantera styrelsesammansättning och signeringsflöden</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Board composition */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Styrelsesammansättning</CardTitle>
              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Lägg till
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Lägg till styrelsemedlem</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Namn</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Förnamn Efternamn" /></div>
                    <div>
                      <Label>Roll</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chairman">Ordförande</SelectItem>
                          <SelectItem value="member">Ledamot</SelectItem>
                          <SelectItem value="deputy">Suppleant</SelectItem>
                          <SelectItem value="ceo">VD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={handleAdd}>Lägg till</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {board.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground">Ingen styrelse registrerad</p>
                <p className="text-xs mt-1">Lägg till styrelseledamöter för att hantera beslut och signeringar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {board.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">Sedan {m.since}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{roleLabels[m.role]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending signatures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Väntande signeringar</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingSignings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PenTool className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground">Inga väntande signeringar</p>
                <p className="text-xs mt-1">Signeringsuppdrag visas här när de skapas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSignings.map((ps) => (
                  <div key={ps.id} className="p-3 rounded-lg border border-border/50">
                    <p className="text-sm font-medium mb-2">{ps.title}</p>
                    <div className="flex items-center gap-2">
                      {ps.signers.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className={`text-[10px] ${s.status === "signed" ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#FAEEDA] text-[#7A5417]"}`}>
                              {s.initials}
                            </AvatarFallback>
                          </Avatar>
                          {s.status === "signed" ? (
                            <CheckCircle2 className="h-3 w-3 text-[#085041]" />
                          ) : (
                            <Clock className="h-3 w-3 text-[#7A5417]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
