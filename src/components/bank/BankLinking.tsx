import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Search, Check, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BankLinkingProps {
  companyId: string;
  onSuccess: () => void;
  /** Where the user should land after the bank callback. Defaults to "standalone" (/bank). */
  flow?: "onboarding" | "standalone";
}

interface ConnectedBankAccount {
  id: string;
  bank_name: string | null;
  account_name: string | null;
  iban: string | null;
  balance: number | null;
  currency: string | null;
}

interface BankInfo {
  id: string;
  name: string;
  bic: string | null;
  logo: string | null;
  countries?: string[];
  auth_method?: string | null;
}

const FALLBACK_BANKS: BankInfo[] = [
  { id: "Nordea", name: "Nordea", bic: null, logo: null },
  { id: "Nordea Corporate", name: "Nordea Corporate", bic: null, logo: null },
  { id: "SEB", name: "SEB", bic: null, logo: null },
  { id: "Swedbank", name: "Swedbank", bic: null, logo: null },
  { id: "Handelsbanken", name: "Handelsbanken", bic: null, logo: null },
  { id: "Länsförsäkringar", name: "Länsförsäkringar Bank", bic: null, logo: null },
];

// Bank-specific brand colors used as fallback initial-tile when no logo
const BRAND_COLORS: Record<string, string> = {
  Nordea: "bg-blue-600",
  SEB: "bg-emerald-700",
  Swedbank: "bg-orange-500",
  Handelsbanken: "bg-sky-700",
  Länsförsäkringar: "bg-blue-800",
  Skandiabanken: "bg-green-600",
  Danske: "bg-blue-700",
  ICA: "bg-red-600",
  Sparbanken: "bg-amber-600",
  Forex: "bg-yellow-600",
  Marginalen: "bg-rose-600",
  Resurs: "bg-purple-600",
};

const getBrandColor = (name: string): string => {
  const match = Object.keys(BRAND_COLORS).find((k) => name.includes(k));
  return match ? BRAND_COLORS[match] : "bg-slate-600";
};

const getInitials = (name: string): string => {
  const cleaned = name.replace(/\b(Bank|Corporate|AB|Sverige|Sweden)\b/gi, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

function BankLogo({ bank }: { bank: BankInfo }) {
  const [errored, setErrored] = useState(false);
  const showImage = bank.logo && !errored;

  return (
    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
      {showImage ? (
        <img
          src={bank.logo!}
          alt={bank.name}
          className="w-full h-full object-contain p-1.5"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className={`w-full h-full ${getBrandColor(bank.name)} flex items-center justify-center`}>
          <span className="text-white text-sm font-bold tracking-tight">
            {getInitials(bank.name)}
          </span>
        </div>
      )}
    </div>
  );
}

export function BankLinking({ companyId, onSuccess, flow = "standalone" }: BankLinkingProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedBankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const hasConnectedAccounts = connectedAccounts.length > 0;

  const displayBankName = useMemo(() => {
    if (connectedAccounts.length === 0) return null;
    const names = Array.from(new Set(connectedAccounts.map((a) => a.bank_name).filter(Boolean)));
    return names.join(", ");
  }, [connectedAccounts]);

  useEffect(() => {
    void loadConnectedAccounts();
  }, [companyId]);

  useEffect(() => {
    if (showPicker && !hasConnectedAccounts && banks.length === 0) void loadBanks();
  }, [showPicker, hasConnectedAccounts, banks.length]);

  const loadConnectedAccounts = async () => {
    setAccountsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_name, iban, balance, currency")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setConnectedAccounts((data || []) as ConnectedBankAccount[]);
    } catch (err) {
      console.error("Failed to load connected bank accounts:", err);
      setConnectedAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const loadBanks = async () => {
    setBanksLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-banks");
      if (error) throw error;
      if (data?.banks?.length) {
        setBanks(data.banks);
      } else {
        setBanks(FALLBACK_BANKS);
      }
    } catch (err) {
      console.error("Failed to load banks:", err);
      setBanks(FALLBACK_BANKS);
    } finally {
      setBanksLoading(false);
    }
  };

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const popularNames = [
    "Nordea",
    "SEB",
    "Swedbank",
    "Handelsbanken",
    "Länsförsäkringar",
    "Skandiabanken",
    "Danske Bank",
    "ICA Banken",
  ];
  const sortedBanks = search
    ? filteredBanks
    : [
        ...filteredBanks.filter((b) => popularNames.some((p) => b.name.includes(p))),
        ...filteredBanks.filter((b) => !popularNames.some((p) => b.name.includes(p))),
      ];

  const initiateConnection = async () => {
    if (!selectedBank) {
      toast({
        title: "Välj en bank",
        description: "Du måste välja en bank innan du kan fortsätta",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-bank-requisition", {
        body: {
          company_id: companyId,
          institution_id: selectedBank,
          auth_method: banks.find((bank) => bank.id === selectedBank)?.auth_method ?? null,
          return_to: flow === "onboarding" ? "onboarding" : "bank",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.link) {
        window.location.href = data.link;
      } else {
        throw new Error("Ingen banklänk mottogs");
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Fel vid bankkoppling",
        description: error.message || "Kunde inte skapa bankkoppling",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Koppla bankkonto</CardTitle>
        <CardDescription>
          {hasConnectedAccounts
            ? "Dina anslutna konton visas här. Lägg till fler konton vid behov."
            : "Anslut ditt företagskonto via PSD2 och BankID."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accountsLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Hämtar bankstatus...
          </div>
        ) : hasConnectedAccounts && !showPicker ? (
          <>
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Bankkonto anslutet{connectedAccounts.length > 1 ? "n" : ""}
                {displayBankName ? ` via ${displayBankName}` : ""}.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-lg border border-border bg-card px-3 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {account.account_name || "Konto"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[account.bank_name, account.iban].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-foreground tabular-nums">
                      {account.balance !== null
                        ? `${Number(account.balance).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} ${account.currency || "SEK"}`
                        : "Saldo hämtas"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPicker(true)}
              className="w-full"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Anslut ytterligare bankkonto
            </Button>
          </>
        ) : !showPicker ? (
          <>
            <Button
              onClick={() => setShowPicker(true)}
              className="w-full"
              size="lg"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Anslut bankkonto
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Säker anslutning via Enable Banking (PSD2). Du loggar in hos din bank med BankID.
            </p>
          </>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök bank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {banksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Hämtar banker...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-1 -mr-1">
                  {sortedBanks.map((bank) => {
                    const isSelected = selectedBank === bank.id;
                    return (
                      <button
                        key={bank.id}
                        onClick={() => setSelectedBank(bank.id)}
                        className={`relative p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 group ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                        }`}
                      >
                        <BankLogo bank={bank} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {bank.name}
                          </div>
                          {bank.bic && (
                            <div className="text-[11px] text-slate-500 font-mono truncate">
                              {bank.bic}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {sortedBanks.length === 0 && (
                  <div className="space-y-3 py-2">
                    <p className="text-center text-sm text-muted-foreground">
                      Ingen bank matchade "{search}"
                    </p>
                    {/SEB|Danske|ICA|Länsförsäkringar Corporate/i.test(search) && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>{search}</strong> är under aktivering hos vår bankpartner.
                          Kontakta <a href="mailto:support@bokfy.se" className="underline font-medium">support@bokfy.se</a> för manuell setup.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </>
            )}

            <Button
              onClick={initiateConnection}
              disabled={!selectedBank || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Ansluter...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Fortsätt med BankID
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Du kommer omdirigeras till din banks inloggningstjänst. Anslutningen är säker och uppfyller PSD2-standarden.
            </p>

            {hasConnectedAccounts && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPicker(false)}
                className="w-full"
              >
                Visa endast anslutna konton
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
