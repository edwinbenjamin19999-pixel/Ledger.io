import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Lock, Eye, ArrowRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface ConnectedAccount { id: string;
  account_name: string;
  iban: string;
  balance: number | null;
  last_synced_at: string | null;
}

interface BankCardData { id: string;
  name: string;
  initials: string;
  color: string;
  textColor?: string;
  connected: boolean;
  accounts: ConnectedAccount[];
}

interface SwedishBankCardsProps { connectedBanks: { bank_name: string; accounts: ConnectedAccount[] }[];
  onConnect: (bankName: string) => void;
  onManualImport: () => void;
}

const SWEDISH_BANKS: Omit<BankCardData, "connected" | "accounts">[] = [
  { id: "swedbank", name: "Swedbank", initials: "SW", color: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]" },
  { id: "seb", name: "SEB", initials: "SEB", color: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" },
  { id: "handelsbanken", name: "Handelsbanken", initials: "SHB", color: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
  { id: "nordea", name: "Nordea", initials: "N", color: "bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]" },
  { id: "danske", name: "Danske Bank", initials: "DB", color: "bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]" },
  { id: "lansforsakringar", name: "Länsförsäkringar", initials: "LF", color: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
  { id: "ica", name: "ICA Banken", initials: "ICA", color: "bg-[#FEF2F2] text-[#BE185D] border-[#FBCFE8]" },
  { id: "sparbanken", name: "Sparbanken", initials: "SP", color: "bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC]" },
  { id: "avanza", name: "Avanza", initials: "AV", color: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]" },
  { id: "other", name: "Övriga banker", initials: "...", color: "bg-[#F8FAFB] text-[#475569] border-[#E2E8F0]" },
];

export function SwedishBankCards({ connectedBanks, onConnect, onManualImport }: SwedishBankCardsProps) {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const banks: BankCardData[] = SWEDISH_BANKS.map((bank) => {
    const match = connectedBanks.find(
      (cb) => cb.bank_name.toLowerCase().includes(bank.name.toLowerCase().split(" ")[0])
    );
    return { ...bank, connected: !!match, accounts: match?.accounts || [] };
  });

  const handleConnect = (bankName: string) => setSelectedBank(bankName);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[10px]">
        {banks.map((bank) => (
          <div
            key={bank.id}
            className={`relative bg-white border-[0.5px] rounded-[12px] p-[14px] cursor-pointer transition-colors hover:bg-[#F8FAFB] ${
              bank.connected ? "border-[#1D9E75]" : "border-[#E2E8F0]"
            }`}
            onClick={() => (bank.connected ? null : handleConnect(bank.name))}
          >
            {bank.connected && (
              <div className="absolute top-[8px] right-[8px]">
                <CheckCircle2 className="h-[14px] w-[14px] text-[#1D9E75]" />
              </div>
            )}
            <div className={`w-[40px] h-[40px] rounded-[10px] border-[0.5px] flex items-center justify-center ${bank.color}`}>
              <span className="font-medium text-[12px]">{bank.initials}</span>
            </div>
            <div className="mt-[10px]">
              <p className="text-[12px] font-medium text-[#0F172A] leading-tight">{bank.name}</p>
              {bank.connected ? (
                <div className="mt-[4px]">
                  <span className="inline-flex items-center px-[8px] h-[18px] rounded-full text-[10px] font-medium bg-[#E1F5EE] text-[#1D6E55]">
                    Ansluten
                  </span>
                  {bank.accounts[0]?.last_synced_at && (
                    <p className="text-[10px] text-[#94A3B8] mt-[4px]">
                      Synk {format(new Date(bank.accounts[0].last_synced_at), "d MMM HH:mm", { locale: sv })}
                    </p>
                  )}
                  <p className="text-[10px] text-[#94A3B8] mt-px">
                    {bank.accounts.length} konto{bank.accounts.length !== 1 ? "n" : ""}
                  </p>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleConnect(bank.name); }}
                  className="mt-[6px] h-[26px] px-[8px] text-[11px] text-[#0B4F6C] hover:bg-[#F8FAFB] rounded-[6px] inline-flex items-center"
                >
                  Anslut <ArrowRight className="h-[12px] w-[12px] ml-[4px]" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PSD2 Dialog */}
      <Dialog open={!!selectedBank} onOpenChange={() => setSelectedBank(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Anslut {selectedBank} via Open Banking
            </DialogTitle>
            <DialogDescription>
              Säker anslutning via PSD2-standarden (EU-reglerat)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-[#EFF6FF] dark:bg-blue-950/30 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                Så fungerar det
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Eye className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                  <span><strong>Enbart läsåtkomst</strong> — vi kan aldrig göra betalningar eller ändringar på ditt konto</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                  <span><strong>PSD2-skyddad</strong> — anslutningen styrs av EU:s Payment Services Directive 2</span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                  <span><strong>BankID-verifiering</strong> — du godkänner varje anslutning med BankID</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border p-4 space-y-2">
              <h4 className="font-semibold text-sm">Vi hämtar automatiskt:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Kontosaldon</li>
                <li>✓ Transaktionshistorik (90 dagar)</li>
                <li>✓ Motkontoinformation</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" size="lg" onClick={() => { onConnect(selectedBank!); setSelectedBank(null); }}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Fortsätt till {selectedBank}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setSelectedBank(null); onManualImport(); }}>
              Importera kontoutdrag manuellt istället
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
