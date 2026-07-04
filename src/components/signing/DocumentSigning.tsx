import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, CheckCircle2, Clock, Send, Plus, Trash2, UserPlus,
  Smartphone, Loader2, AlertTriangle, FileText, QrCode, Mail
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface Signatory { id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isExternal: boolean;
  isRevisor: boolean;
  status: "pending" | "invited" | "signing" | "signed";
  signedAt?: string;
  invitedAt?: string;
}

interface DocumentSigningProps { documentType: "annual_report" | "declaration" | "agi" | "vat" | "document";
  documentTitle: string;
  documentId?: string;
  companyId: string;
  companyName?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  signatories: Signatory[];
  onSignatoriesChange: (signatories: Signatory[]) => void;
  onAllSigned?: () => void;
  readOnly?: boolean;
}

const roleOptions: Record<string, string> = { styrelseordforande: "Styrelseordförande",
  styrelseledamot: "Styrelseledamot",
  vd: "VD",
  suppleant: "Suppleant",
  revisor: "Revisor",
  lekmannarevisor: "Lekmannarevisor",
};

export const DocumentSigning = ({ documentType,
  documentTitle,
  companyName,
  currentUserName,
  currentUserEmail,
  signatories,
  onSignatoriesChange,
  onAllSigned,
  readOnly = false,
}: DocumentSigningProps) => { const [showAddForm, setShowAddForm] = useState(false);
  const [showBankIDModal, setShowBankIDModal] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [bankIDStatus, setBankIDStatus] = useState<"idle" | "started" | "polling" | "signed" | "error">("idle");
  const [newSignatory, setNewSignatory] = useState({ name: "", role: "styrelseledamot", email: "", phone: "", isRevisor: false,
  });

  const allRequiredSigned = signatories.length > 0 && signatories.every(s => s.status === "signed");

  const addSelf = () => { if (signatories.some(s => !s.isExternal && s.email === currentUserEmail)) { toast.info("Du är redan tillagd som undertecknare");
      return;
    }
    const self: Signatory = { id: crypto.randomUUID(),
      name: currentUserName || "Du",
      role: "styrelseledamot",
      email: currentUserEmail || "",
      phone: "",
      isExternal: false,
      isRevisor: false,
      status: "pending",
    };
    onSignatoriesChange([...signatories, self]);
    toast.success("Du har lagts till som undertecknare");
  };

  const addExternal = () => { if (!newSignatory.name.trim() || !newSignatory.email.trim()) { toast.error("Namn och e-post krävs");
      return;
    }
    const ext: Signatory = { id: crypto.randomUUID(),
      name: newSignatory.name.trim(),
      role: newSignatory.role,
      email: newSignatory.email.trim(),
      phone: newSignatory.phone.trim(),
      isExternal: true,
      isRevisor: newSignatory.isRevisor,
      status: "pending",
    };
    onSignatoriesChange([...signatories, ext]);
    setNewSignatory({ name: "", role: "styrelseledamot", email: "", phone: "", isRevisor: false });
    setShowAddForm(false);
    toast.success(`${ext.name} tillagd som undertecknare`);
  };

  const removeSignatory = (id: string) => { onSignatoriesChange(signatories.filter(s => s.id !== id));
  };

  const sendInvite = (id: string) => { const updated = signatories.map(s =>
      s.id === id ? { ...s, status: "invited" as const, invitedAt: new Date().toISOString() } : s
    );
    onSignatoriesChange(updated);
    toast.success("Signeringsinbjudan skickad via e-post");
  };

  const startBankIDSigning = (id: string) => { setSigningId(id);
    setBankIDStatus("started");
    setShowBankIDModal(true);

    // Simulate BankID flow (MVP mock)
    setTimeout(() => setBankIDStatus("polling"), 1500);
    setTimeout(() => { setBankIDStatus("signed");
      const updated = signatories.map(s =>
        s.id === id ? { ...s, status: "signed" as const, signedAt: new Date().toISOString() } : s
      );
      onSignatoriesChange(updated);

      const allSigned = updated.every(s => s.status === "signed");
      if (allSigned) onAllSigned?.();
    }, 5000);
  };

  const closeBankIDModal = () => { setShowBankIDModal(false);
    setBankIDStatus("idle");
    setSigningId(null);
  };

  const documentTypeLabel = { annual_report: "årsredovisningen",
    declaration: "deklarationen",
    agi: "arbetsgivardeklarationen",
    vat: "momsdeklarationen",
    document: "dokumentet",
  }[documentType];

  const boardSignatories = signatories.filter(s => !s.isRevisor);
  const revisorSignatories = signatories.filter(s => s.isRevisor);

  return (
    <div className="space-y-4">
      {/* Status overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Digital signering — {documentTitle}
              </CardTitle>
              <CardDescription>
                Signera {documentTypeLabel} med BankID
                {companyName && ` för ${companyName}`}
              </CardDescription>
            </div>
            {allRequiredSigned ? (
              <Badge className="bg-[#E1F5EE] text-[#085041] dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Alla har signerat
              </Badge>
            ) : (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {signatories.filter(s => s.status === "signed").length}/{signatories.length} signerade
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Board signatories */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Styrelse & VD</CardTitle>
            {!readOnly && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addSelf}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Lägg till mig
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Bjud in
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {boardSignatories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga undertecknare tillagda. Lägg till dig själv eller bjud in styrelseledamöter.
            </p>
          )}
          {boardSignatories.map(s => (
            <SignatoryCard
              key={s.id}
              signatory={s}
              onSign={() => startBankIDSigning(s.id)}
              onInvite={() => sendInvite(s.id)}
              onRemove={() => removeSignatory(s.id)}
              readOnly={readOnly}
            />
          ))}
        </CardContent>
      </Card>

      {/* Revisor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Revisor</CardTitle>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => { setNewSignatory(p => ({ ...p, isRevisor: true, role: "revisor" }));
                setShowAddForm(true);
              }}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Lägg till revisor
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {revisorSignatories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              Ingen revisor tillagd (valfritt)
            </p>
          ) : (
            <div className="space-y-3">
              {revisorSignatories.map(s => (
                <SignatoryCard
                  key={s.id}
                  signatory={s}
                  onSign={() => startBankIDSigning(s.id)}
                  onInvite={() => sendInvite(s.id)}
                  onRemove={() => removeSignatory(s.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Add external signatory dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bjud in undertecknare</DialogTitle>
            <DialogDescription>
              Personen får en e-post med länk för att signera med BankID
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Namn</Label>
              <Input
                placeholder="Anna Andersson"
                value={newSignatory.name}
                onChange={e => setNewSignatory(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Roll</Label>
              <Select value={newSignatory.role} onValueChange={v => setNewSignatory(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleOptions).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>E-post</Label>
              <Input
                type="email"
                placeholder="anna@foretaget.se"
                value={newSignatory.email}
                onChange={e => setNewSignatory(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Mobilnummer</Label>
              <Input
                type="tel"
                placeholder="070-1234567"
                value={newSignatory.phone}
                onChange={e => setNewSignatory(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={addExternal}>
                <Send className="h-4 w-4 mr-2" /> Bjud in
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Avbryt</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BankID signing modal */}
      <Dialog open={showBankIDModal} onOpenChange={closeBankIDModal}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Signera med BankID
            </DialogTitle>
            <DialogDescription>
              {bankIDStatus === "started" && "Startar BankID..."}
              {bankIDStatus === "polling" && "Öppna BankID-appen på din mobil eller dator"}
              {bankIDStatus === "signed" && "Signeringen lyckades!"}
              {bankIDStatus === "error" && "Ett fel uppstod"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            {bankIDStatus === "started" && (
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            )}
            {bankIDStatus === "polling" && (
              <div className="space-y-4">
                <div className="mx-auto w-40 h-40 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <QrCode className="h-20 w-20 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Skanna QR-koden med BankID-appen
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Väntar på signering...
                </div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info("BankID-appen öppnas på din enhet")}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Öppna BankID på denna enhet
                </Button>
              </div>
            )}
            {bankIDStatus === "signed" && (
              <div className="space-y-3">
                <CheckCircle2 className="h-16 w-16 text-[#085041] mx-auto" />
                <p className="text-sm font-medium">Dokumentet har signerats</p>
                <p className="text-xs text-muted-foreground">
                  Signerat {new Date().toLocaleString("sv-SE")}
                </p>
                <Button className="w-full mt-4" onClick={closeBankIDModal}>Stäng</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Signatory card sub-component
const SignatoryCard = ({ signatory,
  onSign,
  onInvite,
  onRemove,
  readOnly,
}: { signatory: Signatory;
  onSign: () => void;
  onInvite: () => void;
  onRemove: () => void;
  readOnly: boolean;
}) => { const statusBadge = { pending: <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Väntar</Badge>,
    invited: <Badge variant="secondary" className="text-[10px]"><Mail className="h-2.5 w-2.5 mr-1" />Inbjudan skickad</Badge>,
    signing: <Badge className="text-[10px] bg-[#EFF6FF] text-blue-800"><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />Signerar</Badge>,
    signed: <Badge className="text-[10px] bg-[#E1F5EE] text-[#085041] dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Signerat</Badge>,
  }[signatory.status];

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">
            {signatory.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{signatory.name}</p>
            {signatory.isExternal && <Badge variant="outline" className="text-[9px]">Extern</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {roleOptions[signatory.role] || signatory.role}
            {signatory.signedAt && ` · Signerat ${new Date(signatory.signedAt).toLocaleString("sv-SE")}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {statusBadge}
        {!readOnly && signatory.status === "pending" && !signatory.isExternal && (
          <Button size="sm" onClick={onSign}>
            <Shield className="h-3.5 w-3.5 mr-1" /> Signera
          </Button>
        )}
        {!readOnly && signatory.status === "pending" && signatory.isExternal && (
          <Button size="sm" variant="outline" onClick={onInvite}>
            <Send className="h-3.5 w-3.5 mr-1" /> Skicka
          </Button>
        )}
        {!readOnly && signatory.status === "invited" && signatory.isExternal && (
          <Button size="sm" variant="ghost" onClick={onInvite}>
            <Send className="h-3.5 w-3.5 mr-1" /> Påminn
          </Button>
        )}
        {!readOnly && signatory.status !== "signed" && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
};
