import { ConsentManager } from "@/components/gdpr/ConsentManager";
import { DataExport } from "@/components/gdpr/DataExport";
import { AccountDeletion } from "@/components/gdpr/AccountDeletion";
import { DPIATemplate } from "@/components/gdpr/DPIATemplate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Download, Trash2, Search, FileJson, Loader2, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useState } from "react";
import { toast } from "sonner";
import { useExportPersonalData, useGDPRAuditLog } from "@/hooks/useGDPR";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GDPRSettings = () => {
  const [sarEmail, setSarEmail] = useState("");
  const [sarError, setSarError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const exportMutation = useExportPersonalData();
  const { data: auditLog, isLoading: auditLoading } = useGDPRAuditLog();

  const validateAndConfirm = () => {
    setSarError("");
    if (!sarEmail.trim()) {
      setSarError("Ange personens e-postadress");
      return;
    }
    if (!sarEmail.includes("@")) {
      setSarError("Ange en giltig e-postadress");
      return;
    }
    setConfirmOpen(true);
  };

  const handleSAR = async () => {
    setConfirmOpen(false);
    try {
      await exportMutation.mutateAsync(sarEmail.trim());
      toast.success("Persondata exporterad och nedladdad");
      setSarEmail("");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte exportera data");
    }
  };

  return (
    <div>
      <PageHeader
        icon={Shield}
        
        title="GDPR & Dataskydd"
        subtitle="Hantera din data, samtycken och integritetsrättigheter enligt GDPR"
      />
      <div className="px-8 space-y-6">
        <Tabs defaultValue="consent" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="consent" className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Samtycken
            </TabsTrigger>
            <TabsTrigger value="sar" className="flex items-center gap-2">
              <Search className="h-4 w-4" /> SAR
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Exportera data
            </TabsTrigger>
            <TabsTrigger value="delete" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Radera konto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consent" className="space-y-4"><ConsentManager /></TabsContent>

          <TabsContent value="sar" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  <CardTitle>Subject Access Request (SAR)</CardTitle>
                </div>
                <CardDescription>
                  Exportera alla lagrade personuppgifter för en specifik person enligt GDPR artikel 15
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col gap-1 max-w-sm flex-1">
                    <Input
                      placeholder="Personens e-postadress"
                      type="email"
                      value={sarEmail}
                      onChange={e => {
                        setSarEmail(e.target.value);
                        if (sarError) setSarError("");
                      }}
                      className={sarError ? "border-destructive" : ""}
                    />
                    {sarError && (
                      <p className="text-xs text-destructive">{sarError}</p>
                    )}
                  </div>
                  <Button onClick={validateAndConfirm} disabled={exportMutation.isPending}>
                    {exportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Exportera persondata
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exporten innehåller anställduppgifter, utlägg och tidrapporter kopplade till angiven e-postadress. Lönedata redakteras. Exporten loggas i revisionsloggen.
                </p>
              </CardContent>
            </Card>

            {/* Confirmation dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bekräfta SAR-export</AlertDialogTitle>
                  <AlertDialogDescription>
                    Du är på väg att exportera persondata för <strong>{sarEmail}</strong>.
                    Exporten loggas i revisionsloggen. Fortsätt?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSAR}>Exportera</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* GDPR audit log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-5 w-5" /> GDPR-logg
                </CardTitle>
                <CardDescription>Historik över SAR-förfrågningar och dataraderingar</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (auditLog ?? []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">Inga GDPR-händelser registrerade ännu.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Händelse</TableHead>
                        <TableHead>Detaljer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditLog ?? []).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs">
                            {new Date(entry.created_at).toLocaleString("sv-SE")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {entry.action === 'gdpr_sar_export' ? 'SAR Export' :
                               entry.action === 'gdpr_deletion' ? 'Radering' : entry.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.description || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4"><DataExport /></TabsContent>
          <TabsContent value="delete" className="space-y-4"><AccountDeletion /></TabsContent>
        </Tabs>

        <DPIATemplate />

        <div className="p-4 border-[0.5px] border-[#E2E8F0] rounded-[12px] bg-[#F8FAFC]">
          <h3 className="font-semibold mb-2">Dina GDPR-rättigheter</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Rätt till tillgång</strong> - Du kan begära en kopia av din data</li>
            <li>• <strong>Rätt till rättelse</strong> - Du kan korrigera felaktig information</li>
            <li>• <strong>Rätt till radering</strong> - Du kan begära att vi raderar din data</li>
            <li>• <strong>Rätt till dataportabilitet</strong> - Du kan exportera din data</li>
            <li>• <strong>Rätt att återkalla samtycke</strong> - Du kan när som helst ändra dina samtycken</li>
            <li>• <strong>Rätt att göra invändningar</strong> - Du kan invända mot viss databehandling</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GDPRSettings;
