import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";
import { BankLinking } from "@/components/bank/BankLinking";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { FocusGoalPicker, type FocusGoal } from "@/components/onboarding/FocusGoalPicker";
import { TrustBar } from "@/components/onboarding/TrustBar";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId, setStoredActiveCompanyId } from "@/lib/company-selection";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, Check, ShieldCheck, Info, Landmark, FileText, FileSignature } from "lucide-react";
import { BankIDDemoDialog } from "@/components/tax-agent/shared/BankIDDemoDialog";
import { parseSignatoryRule } from "@/lib/onboarding/signatoryRule";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface BolagsverketLookup {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  vatNumber?: string | null;
  registrationDate?: string | null;
  businessDescription?: string | null;
  organizationForm?: { code: string; description: string } | null;
  organizationFormLabel?: string | null;
  legalForm?: { code: string; description: string } | null;
  companyType?: string | null;
  sniCodes?: { code: string; description: string }[];
  isActive?: boolean;
  isDeregistered?: boolean;
  source?: string;
  rawBolagsverket?: unknown;
}

type OnboardingCompany = {
  id: string;
  name: string | null;
  org_number: string | null;
  vat_number: string | null;
  business_description: string | null;
  kyc_status: string | null;
};

type CompanyRoleRow = {
  companies: OnboardingCompany | OnboardingCompany[] | null;
};

/**
 * Whitelist för internt testkonto-genvägen i steg 1.
 * Lägg till e-postadresser i lowercase. Endast dessa användare ser
 * "Hoppa över – skapa testkonto"-länken och får skapa TEMP-bolag.
 */
const TEST_ACCOUNT_WHITELIST: string[] = [
  "rebecka@tallmark.se",
  "rebecca.tallmark@gmail.com",
];

const QuickOnboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Step 1 — company
  const [companyName, setCompanyName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [bvData, setBvData] = useState<BolagsverketLookup | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState<{ id: string; name: string } | null>(null);

  // Step 2 — KYC (AML-compliant: penningtvättslagen 2017:630)
  // OBS: Ingen BankID-signering här — all signering sker samlat i steg 5.
  const [kycVatNumber, setKycVatNumber] = useState("");
  const [kycDescription, setKycDescription] = useState("");
  const [kycBeneficialOwner, setKycBeneficialOwner] = useState("");
  const [kycBeneficialPersonnummer, setKycBeneficialPersonnummer] = useState("");
  const [kycOwnershipPct, setKycOwnershipPct] = useState("");
  const [kycPurpose, setKycPurpose] = useState("");
  const [kycExpectedTurnover, setKycExpectedTurnover] = useState("");
  const [kycCashIntensive, setKycCashIntensive] = useState(false);
  const [kycInternational, setKycInternational] = useState(false);
  const [kycPep, setKycPep] = useState<"no" | "yes" | "">("");
  const [kycSanctionsConfirmed, setKycSanctionsConfirmed] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycDone, setKycDone] = useState(false);

  // Step 3 — Bank
  const [bankAccountCount, setBankAccountCount] = useState(0);
  const [connectedBankAccounts, setConnectedBankAccounts] = useState<Array<{
    id: string; bank_name: string | null; account_name: string | null;
    iban: string | null; balance: number | null; currency: string | null;
  }>>([]);
  const [bankConnectedAt, setBankConnectedAt] = useState<number | null>(null);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  // Step 4 — Focus
  const [focusGoal, setFocusGoal] = useState<FocusGoal | null>(null);

  // Step 5 — Samlad signering (KYC + avtal i ett svep med BankID, av firmatecknare)
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [agreementBankIdOpen, setAgreementBankIdOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [coSignerName, setCoSignerName] = useState("");
  const [coSignerEmail, setCoSignerEmail] = useState("");
  const [coSignerMessage, setCoSignerMessage] = useState("");

  // Firmatecknare från Bolagsverket
  type SignatoryPerson = {
    name?: string | null;
    role?: string | null;
    personalNumber?: string | null;
    [k: string]: unknown;
  };
  const [signatories, setSignatories] = useState<SignatoryPerson[]>([]);
  const [signatoryRule, setSignatoryRule] = useState<string>("");
  const [signatorySource, setSignatorySource] = useState<string>("");
  const [signatoriesLoading, setSignatoriesLoading] = useState(false);
  const [signerIsAuthorized, setSignerIsAuthorized] = useState(false);
  const [signerName, setSignerName] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (prev) root.setAttribute("data-theme", prev);
      else root.removeAttribute("data-theme");
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Hydrate from latest company + ?step= deeplink
  useEffect(() => {
    if (!user || hydrated) return;
    const hydrate = async () => {
      try {
        const requestedCompanyId = searchParams.get("company") || getStoredActiveCompanyId();
        const { data: roles } = await supabase
          .from("user_roles")
          .select("company_id, companies!inner(id, name, org_number, vat_number, business_description, kyc_status)")
          .eq("user_id", user.id);
        const companies = ((roles || []) as CompanyRoleRow[])
          .map((row) => (Array.isArray(row.companies) ? row.companies[0] : row.companies))
          .filter((company): company is OnboardingCompany => Boolean(company));
        const latest = requestedCompanyId
          ? companies.find((company) => company.id === requestedCompanyId) ?? companies[0]
          : companies[0];
        let companyMeta: Record<string, unknown> = {};
        let latestBankCount = 0;
        if (latest) {
          setCreatedCompanyId(latest.id);
          setStoredActiveCompanyId(latest.id);
          if (latest.name) setCompanyName(latest.name);
          if (latest.org_number && !latest.org_number.startsWith("TEMP-")) {
            const o = latest.org_number;
            setOrgNumber(o.length > 6 ? `${o.slice(0, 6)}-${o.slice(6)}` : o);
            setLookupDone(true);
          }
          if (latest.vat_number) setKycVatNumber(latest.vat_number);
          if (latest.business_description) setKycDescription(latest.business_description);
          if (latest.kyc_status && latest.kyc_status !== "not_started") setKycDone(true);

          // Bank count
          const { count } = await supabase
            .from("bank_accounts")
            .select("id", { count: "exact", head: true })
            .eq("company_id", latest.id);
          latestBankCount = count ?? 0;
          setBankAccountCount(latestBankCount);

          // Onboarding completion / agreement state from metadata
          try {
            const { data: metaRow } = await (supabase
              .from("companies")
              .select("metadata")
              .eq("id", latest.id)
              .maybeSingle() as unknown as Promise<{ data: { metadata: Record<string, unknown> | null } | null }>);
            companyMeta = (metaRow?.metadata as Record<string, unknown> | null) ?? {};
            if (companyMeta.agreement_signed_at) setAgreementSigned(true);
          } catch { /* silent */ }
        }

        // Test accounts and already-completed onboarding skip the flow entirely,
        // even if URL contains ?step=1.
        if (companyMeta.is_test_account === true || companyMeta.onboarding_completed_at) {
          navigate("/dashboard?welcome=1", { replace: true });
          return;
        }

        // Apply ?step=
        const stepParam = searchParams.get("step");
        if (stepParam) {
          const n = parseInt(stepParam, 10);
          if (n >= 1 && n <= 6) {
            if (n === 1) setStep(1);
            else if (n === 2 && latest) setStep(2);
            else if (n >= 3 && latest) setStep(n as Step);
          }
        } else if (latest) {
          // Resume at first incomplete step
          if (!latest.org_number || latest.org_number.startsWith("TEMP-")) setStep(1);
          else if (!latest.kyc_status || latest.kyc_status === "not_started") setStep(2);
          else if (latestBankCount === 0 && companyMeta.onboarding_bank_skipped !== true) setStep(3);
          else if (!companyMeta.agreement_signed_at) setStep(4);
          else setStep(6);
        }
      } catch {
        /* silent */
      } finally {
        setHydrated(true);
      }
    };
    hydrate();
  }, [user, hydrated, searchParams]);

  // React to bank callback return (?bank=success | ?bank=warning | ?bank=error)
  useEffect(() => {
    const bankFlag = searchParams.get("bank");
    const reason = searchParams.get("reason");
    if (bankFlag === "success") {
      toast.success("Bankkonto kopplat!");
    } else if (bankFlag === "warning") {
      toast.warning(
        reason === "no_usable_accounts"
          ? "Banken svarade, men inga riktiga konton kunde sparas."
          : "Bankanslutningen slutfördes utan användbara konton.",
      );
    } else if (bankFlag === "error") {
      const msg = searchParams.get("error");
      toast.error(msg ? decodeURIComponent(msg) : "Bankanslutningen misslyckades");
    }
  }, [searchParams]);

  // Step 4 — load connected bank accounts via Realtime + initial fetch.
  // Live-updates when balance lands; no polling forever.
  useEffect(() => {
    if (step !== 4) return;
    const companyForPoll = createdCompanyId || searchParams.get("company");
    if (!companyForPoll) return;
    let active = true;

    const fetchAccounts = async () => {
      const { data } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_name, iban, balance, currency")
        .eq("company_id", companyForPoll)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (!active) return;
      const accounts = ((data || []) as typeof connectedBankAccounts).filter((account) => {
        const accountName = String(account.account_name || "").toLowerCase();
        const bankName = String(account.bank_name || "").toLowerCase();
        const iban = String(account.iban || "");
        return !(
          accountName.includes("sandbox") ||
          bankName.includes("sandbox") ||
          bankName === "bank" ||
          iban === "SE1160000000000923451110" ||
          iban === "SE6860000000000923462112" ||
          /^SE\d{2}600000000009234/.test(iban)
        );
      });
      setConnectedBankAccounts(accounts);
      if (accounts.length > 0 && bankConnectedAt === null) {
        setBankConnectedAt(Date.now());
      }
    };

    void fetchAccounts();

    const channel = supabase
      .channel(`onboarding-bank-${companyForPoll}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_accounts", filter: `company_id=eq.${companyForPoll}` },
        () => { void fetchAccounts(); },
      )
      .subscribe();

    // Safety net: a low-frequency refresh in case Realtime is blocked
    const id = setInterval(fetchAccounts, 6000);

    return () => {
      active = false;
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, [step, createdCompanyId, searchParams]);

  // Manually retry balance fetch by triggering a transaction sync (which also refreshes balance).
  const retryBalanceFetch = useCallback(async () => {
    if (refreshingBalance || connectedBankAccounts.length === 0) return;
    setRefreshingBalance(true);
    try {
      await Promise.all(
        connectedBankAccounts.map((a) =>
          supabase.functions.invoke("fetch-bank-transactions", {
            body: { bank_account_id: a.id },
          }),
        ),
      );
      toast.success("Saldo uppdaterat");
    } catch (e) {
      toast.error("Kunde inte hämta saldo just nu");
    } finally {
      setRefreshingBalance(false);
    }
  }, [refreshingBalance, connectedBankAccounts]);

  // Poll bank account count while on step 3
  useEffect(() => {
    if (step !== 3 || !createdCompanyId) return;
    let active = true;
    const tick = async () => {
      const { count } = await supabase
        .from("bank_accounts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", createdCompanyId);
      if (active) setBankAccountCount(count ?? 0);
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [step, createdCompanyId]);

  useEffect(() => {
    const companyId = createdCompanyId || searchParams.get("company");
    const bankSuccess = searchParams.get("bank") === "success";
    if (!bankSuccess || !companyId) return;

    let cancelled = false;
    const syncAfterSuccess = async () => {
      const { count } = await supabase
        .from("bank_accounts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      if (cancelled) return;
      const nextCount = count ?? 0;
      setBankAccountCount(nextCount);
      if (nextCount > 0) setStep(4);
    };

    void syncAfterSuccess();
    return () => {
      cancelled = true;
    };
  }, [createdCompanyId, searchParams]);

  // Hämta firmatecknare från Bolagsverket när vi når steg 5
  useEffect(() => {
    if (step !== 5 || !createdCompanyId) return;
    let cancelled = false;
    const loadSignatories = async () => {
      setSignatoriesLoading(true);
      try {
        const { data } = await (supabase
          .from("company_signatories")
          .select("persons, signatory_rule, source")
          .eq("company_id", createdCompanyId)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle() as unknown as Promise<{
            data: { persons: SignatoryPerson[] | null; signatory_rule: string | null; source: string | null } | null;
          }>);
        if (cancelled) return;
        setSignatories(Array.isArray(data?.persons) ? (data!.persons as SignatoryPerson[]) : []);
        setSignatoryRule(data?.signatory_rule ?? "");
        setSignatorySource(data?.source ?? "");
      } catch {
        if (!cancelled) {
          setSignatories([]);
          setSignatoryRule("");
          setSignatorySource("");
        }
      } finally {
        if (!cancelled) setSignatoriesLoading(false);
      }
    };
    loadSignatories();
    return () => { cancelled = true; };
  }, [step, createdCompanyId]);

  const cleanOrg = orgNumber.replace(/[\s-]/g, "");

  const lookupCompany = useCallback(async (org: string) => {
    setLookingUp(true);
    setAlreadyRegistered(null);
    try {
      const { data, error } = await supabase.functions.invoke("company-lookup", {
        body: { orgNumber: org },
      });
      if (
        !error &&
        data &&
        !data.error &&
        !data.requiresManualEntry &&
        data.source === "bolagsverket"
      ) {
        // Only trust data when it actually comes from Bolagsverket — never from scrapers.
        if (data.name) setCompanyName(data.name);
        if (data.address) setCompanyAddress(data.address);
        if (data.vatNumber) setKycVatNumber(data.vatNumber);
        if (data.businessDescription) setKycDescription(data.businessDescription);
        setBvData(data as BolagsverketLookup);
        setLookupDone(true);
        if (data.name) toast.success(`Hittade: ${data.name}`);
      } else {
        setBvData(null);
        setLookupDone(true);
        if (data?.bolagsverketUnavailable) {
          toast.error(
            "Bolagsverket är tillfälligt otillgängligt. Fyll i företagsnamn manuellt — vi verifierar det automatiskt när tjänsten är uppe igen.",
            { duration: 6000 },
          );
        }
      }

      try {
        const { data: dup } = await supabase.rpc(
          "check_company_already_registered" as never,
          { _org_number: org } as never,
        ) as unknown as { data: Array<{ exists_already: boolean; company_id: string; company_name: string }> | null };
        if (Array.isArray(dup) && dup.length > 0 && dup[0].exists_already) {
          setAlreadyRegistered({ id: dup[0].company_id, name: dup[0].company_name });
        }
      } catch {
        /* silent */
      }
    } catch {
      setLookupDone(true);
    } finally {
      setLookingUp(false);
    }
  }, []);

  useEffect(() => {
    if (cleanOrg.length === 10 && !lookupDone) {
      lookupCompany(cleanOrg);
    }
  }, [cleanOrg, lookupDone, lookupCompany]);

  const handleOrgChange = (value: string) => {
    let clean = value.replace(/[^\d-]/g, "").replace(/-/g, "");
    if (clean.length > 10) clean = clean.slice(0, 10);
    const formatted = clean.length > 6 ? `${clean.slice(0, 6)}-${clean.slice(6)}` : clean;
    setOrgNumber(formatted);
    setLookupDone(false);
    setBvData(null);
    setAlreadyRegistered(null);
  };

  const requestAccessToExisting = () => {
    if (!alreadyRegistered) return;
    navigate(`/auth?requestAccess=1&orgNumber=${cleanOrg}`);
  };

  const createTestAccountAndAdvance = async () => {
    if (createdCompanyId) {
      navigate("/dashboard");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Inte inloggad");

      // Hård spärr: endast whitelistade e-postadresser får skapa testkonto.
      if (!TEST_ACCOUNT_WHITELIST.includes((u.email || "").toLowerCase())) {
        throw new Error("Testkonto är endast tillgängligt för interna användare.");
      }

      const tempOrg = `TEMP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const displayName = companyName.trim() || "Testbolag AB";

      const { data: company, error } = await supabase
        .from("companies")
        .insert([{
          name: displayName,
          org_number: tempOrg,
          created_by: u.id,
          metadata: {
            is_test_account: true,
            onboarding_completed_at: new Date().toISOString(),
            agreement_signed_at: new Date().toISOString(),
            onboarding_bank_skipped: true,
            test_account_created_at: new Date().toISOString(),
          },
        } as never])
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!company) throw new Error("Kunde inte skapa testbolag");

      setCreatedCompanyId(company.id);
      setStoredActiveCompanyId(company.id);
      window.dispatchEvent(new Event("company-changed"));
      toast.success("Testkonto skapat – välkommen!");
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunde inte skapa testkonto";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const createCompanyAndAdvance = async () => {
    if (!companyName.trim() || cleanOrg.length !== 10) {
      toast.error("Fyll i företagsnamn och organisationsnummer");
      return;
    }
    if (alreadyRegistered) {
      toast.error("Detta bolag är redan registrerat på Ledger.io. Begär åtkomst istället.");
      return;
    }

    // If we already have a created company, just advance
    if (createdCompanyId) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Inte inloggad");

      const insertPayload: Record<string, unknown> = {
        name: companyName.trim(),
        org_number: cleanOrg,
        address: companyAddress || null,
        created_by: u.id,
      };

      if (bvData) {
        if (bvData.city) insertPayload.city = bvData.city;
        if (bvData.postalCode) insertPayload.postal_code = bvData.postalCode;
        if (bvData.vatNumber) insertPayload.vat_number = bvData.vatNumber;
        if (bvData.businessDescription) insertPayload.business_description = bvData.businessDescription;
        if (bvData.companyType) insertPayload.company_type = bvData.companyType;
        // Only accept ISO date format YYYY-MM-DD — Bolagsverket sometimes returns partial values
        if (bvData.registrationDate && /^\d{4}-\d{2}-\d{2}$/.test(bvData.registrationDate)) {
          insertPayload.registration_date = bvData.registrationDate;
        }
        if (bvData.legalForm?.description) insertPayload.legal_form = bvData.legalForm.description;
        if (bvData.sniCodes && bvData.sniCodes.length > 0) {
          insertPayload.sni_codes = bvData.sniCodes;
        }
        insertPayload.bolagsverket_synced_at = new Date().toISOString();
        insertPayload.bolagsverket_data = bvData.rawBolagsverket ?? bvData;
        insertPayload.engagements_status = "pending";
      }

      const { data: company, error } = await supabase
        .from("companies")
        .insert([insertPayload as never])
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!company) throw new Error("Kunde inte skapa företag");
      setCreatedCompanyId(company.id);
      setStoredActiveCompanyId(company.id);
      window.dispatchEvent(new Event("company-changed"));

      // Fire-and-forget: hämta de 3 senaste årsredovisningarna från Bolagsverket
      // samt synka firmatecknare/engagemang. Båda körs parallellt och blockerar inte onboardingen.
      supabase.functions.invoke("fetch-bolagsverket-annual-reports", {
        body: { companyId: company.id, orgNumber: cleanOrg },
      }).catch((e) => console.warn("Annual reports fetch failed:", e));
      supabase.functions.invoke("sync-bolagsverket-engagements", {
        body: { companyId: company.id, orgNumber: cleanOrg },
      }).catch(() => {});

      setStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunde inte skapa företag";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitKYC = async () => {
    if (!createdCompanyId) {
      toast.error("Inget företag skapat ännu");
      return;
    }
    if (!kycDescription.trim() || kycDescription.trim().length < 10) {
      toast.error("Beskriv din verksamhet (minst 10 tecken)");
      return;
    }
    if (!kycBeneficialOwner.trim()) {
      toast.error("Ange verklig huvudman");
      return;
    }
    if (!/^\d{6,8}-?\d{4}$/.test(kycBeneficialPersonnummer.replace(/\s/g, ""))) {
      toast.error("Ogiltigt personnummer (YYYYMMDD-XXXX)");
      return;
    }
    const ownership = parseInt(kycOwnershipPct, 10);
    if (isNaN(ownership) || ownership < 25 || ownership > 100) {
      toast.error("Ägarandel måste vara mellan 25 och 100 %");
      return;
    }
    if (!kycPurpose.trim()) {
      toast.error("Ange syftet med affärsrelationen");
      return;
    }
    if (!kycPep) {
      toast.error("Bekräfta PEP-status");
      return;
    }
    if (!kycSanctionsConfirmed) {
      toast.error("Bekräfta sanktionskontroll");
      return;
    }

    // Spara KYC direkt — själva BankID-signeringen sker samlat i steg 5
    setKycSubmitting(true);
    try {
      const turnover = kycExpectedTurnover ? parseInt(kycExpectedTurnover, 10) : null;

      const { data: row } = await (supabase
        .from("companies")
        .select("metadata")
        .eq("id", createdCompanyId)
        .maybeSingle() as unknown as Promise<{ data: { metadata: Record<string, unknown> | null } | null }>);
      const existing = (row?.metadata as Record<string, unknown> | null) ?? {};
      const kycPayload = {
        beneficial_owner: {
          name: kycBeneficialOwner.trim(),
          personnummer_last4: kycBeneficialPersonnummer.replace(/\s|-/g, "").slice(-4),
          personnummer_hash: btoa(kycBeneficialPersonnummer.replace(/\s|-/g, "")),
          ownership_pct: ownership,
        },
        purpose: kycPurpose.trim(),
        expected_turnover_sek: turnover,
        risk_factors: {
          cash_intensive: kycCashIntensive,
          international: kycInternational,
          pep: kycPep === "yes",
        },
        sanctions_screened_at: new Date().toISOString(),
        signed_with_bankid: false, // signeras samlat i steg 5
        submitted_at: new Date().toISOString(),
        version: 3,
      };

      const { error } = await supabase.from("companies").update({
        vat_number: kycVatNumber.trim() || null,
        business_description: kycDescription.trim(),
        kyc_status: "pending",
        metadata: { ...existing, kyc: kycPayload },
        updated_at: new Date().toISOString(),
      } as never).eq("id", createdCompanyId);
      if (error) throw error;

      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        await supabase.from("audit_log").insert({
          company_id: createdCompanyId,
          user_id: u.id,
          action: "kyc_submitted",
          description: `KYC inlämnad (AML v3, väntar på BankID i steg 5). Verklig huvudman: ${kycBeneficialOwner.trim()} (${ownership}%). PEP: ${kycPep}.`,
        });
      }

      setKycDone(true);
      toast.success("KYC sparad — signering sker i sista steget");
      setStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "KYC misslyckades";
      toast.error(msg);
    } finally {
      setKycSubmitting(false);
    }
  };

  const skipBankTemporarily = async () => {
    if (!createdCompanyId) return;
    try {
      const { data: company } = await (supabase
        .from("companies")
        .select("metadata")
        .eq("id", createdCompanyId)
        .maybeSingle() as unknown as Promise<{ data: { metadata: Record<string, unknown> | null } | null }>);
      const existing = (company?.metadata as Record<string, unknown> | null) ?? {};
      const merged = { ...existing, onboarding_bank_skipped: true };
      await supabase
        .from("companies")
        .update({ metadata: merged } as never)
        .eq("id", createdCompanyId);
      toast.info("Du kan koppla bank senare från dashboarden");
      setStep(4);
    } catch {
      setStep(4);
    }
  };

  const handleFocusContinue = () => {
    if (focusGoal) {
      try { localStorage.setItem("onboarding_focus", focusGoal); } catch { /* ignore */ }
    }
    setStep(5);
  };

  const parsedRule = parseSignatoryRule(signatoryRule);
  const requiresCoSigner = parsedRule.requiredSignatures === 2;
  const coSignerEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coSignerEmail.trim());
  const canFinalize =
    agreementAccepted &&
    signerIsAuthorized &&
    !!signerName.trim() &&
    !completing &&
    (!requiresCoSigner || (!!coSignerName.trim() && coSignerEmailValid));

  const finalizeAgreement = async () => {
    if (!createdCompanyId) return;
    setCompleting(true);
    try {
      const { data: row } = await (supabase
        .from("companies")
        .select("metadata")
        .eq("id", createdCompanyId)
        .maybeSingle() as unknown as Promise<{ data: { metadata: Record<string, unknown> | null } | null }>);
      const existing = (row?.metadata as Record<string, unknown> | null) ?? {};
      const existingKyc = (existing.kyc as Record<string, unknown> | undefined) ?? {};
      const now = new Date().toISOString();

      const normalizedSigner = signerName.trim().toLowerCase();
      const matchedSignatory = signatories.find((p) => {
        const n = (p?.name ?? "").toString().trim().toLowerCase();
        return n.length > 0 && (n === normalizedSigner || n.includes(normalizedSigner) || normalizedSigner.includes(n));
      });

      const { data: { user: u } } = await supabase.auth.getUser();

      // Create co_signatures session (always, so we have a single audit trail)
      const { data: coSig } = await (supabase
        .from("co_signatures" as never)
        .insert({
          company_id: createdCompanyId,
          document_type: "onboarding_agreement",
          document_version: "2025-01",
          signatory_rule_mode: parsedRule.mode,
          signatory_rule_text: parsedRule.rawText,
          required_count: parsedRule.requiredSignatures,
          completed_count: 1,
          status: requiresCoSigner ? "partial" : "complete",
          completed_at: requiresCoSigner ? null : now,
          created_by: u?.id ?? null,
          metadata: {
            needs_manual_review: parsedRule.needsManualReview,
            initiator_matched_in_bolagsverket: !!matchedSignatory,
          },
        } as never)
        .select("id")
        .maybeSingle() as unknown as Promise<{ data: { id: string } | null }>);

      if (coSig?.id && u) {
        await (supabase.from("co_signature_signers" as never) as unknown as {
          insert: (v: unknown) => Promise<unknown>;
        }).insert({
          co_signature_id: coSig.id,
          name: signerName.trim(),
          email: u.email ?? "",
          role: "initiator",
          token: `cs_init_${crypto.randomUUID().split("-").join("")}`,
          user_id: u.id,
          signed_at: now,
          signed_with_bankid: true,
        });
      }

      const merged: Record<string, unknown> = {
        ...existing,
        kyc: { ...existingKyc, signed_with_bankid: true, signed_at: now },
        agreement_signed_at: now,
        agreement_version: "2025-01",
        agreement_signed_with: "bankid_demo",
        agreement_signer: {
          declared_name: signerName.trim(),
          confirmed_authorized: signerIsAuthorized,
          matched_in_bolagsverket: !!matchedSignatory,
          matched_role: matchedSignatory?.role ?? null,
          signatory_rule: signatoryRule || null,
          signatory_rule_mode: parsedRule.mode,
          signatory_source: signatorySource || null,
        },
        onboarding_completed_at: now,
      };

      if (requiresCoSigner && coSig?.id) {
        merged.cosigning_pending = true;
        merged.pending_cosignature_id = coSig.id;
        merged.pending_cosigner = {
          name: coSignerName.trim(),
          email: coSignerEmail.trim().toLowerCase(),
          invitedAt: now,
        };
      } else {
        merged.agreement_fully_signed_at = now;
      }

      await supabase
        .from("companies")
        .update({ metadata: merged } as never)
        .eq("id", createdCompanyId);

      if (u) {
        await supabase.from("audit_log").insert({
          company_id: createdCompanyId,
          user_id: u.id,
          action: "agreement_signed",
          description:
            `Kundavtal + KYC signerat med BankID (v 2025-01). ` +
            `Signerare: ${signerName.trim()} ` +
            `(firmatecknare: ${matchedSignatory ? `ja, ${matchedSignatory.role ?? "registrerad"}` : "ej verifierad"}). ` +
            `Regel: ${parsedRule.humanLabel} (${parsedRule.mode}). ` +
            `Krävs: ${parsedRule.requiredSignatures} signatur(er).`,
        });
      }

      // Send invite to co-signer if joint signing
      if (requiresCoSigner && coSig?.id) {
        try {
          await supabase.functions.invoke("send-cosigner-invite", {
            body: {
              coSignatureId: coSig.id,
              name: coSignerName.trim(),
              email: coSignerEmail.trim().toLowerCase(),
              message: coSignerMessage.trim() || undefined,
            },
          });
          toast.success(`Inbjudan skickad till ${coSignerEmail.trim()}`);
        } catch {
          toast.warning("Avtal signerat — men inbjudan till medsignerare misslyckades. Du kan skicka påminnelse från dashboarden.");
        }
      }

      setAgreementSigned(true);
      toast.success(requiresCoSigner ? "Konto aktiverat — väntar på medsignering" : "Avtal och KYC signerat");
      setStep(6);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunde inte signera avtalet";
      toast.error(msg);
    } finally {
      setCompleting(false);
    }
  };

  const goToDashboard = () => navigate("/dashboard?welcome=1");
  const goToMigration = () => navigate("/migration");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }
  if (!user) return null;

  const primaryBtn =
    "w-full h-[52px] rounded-xl bg-[#3b82f6] hover:bg-[#3b82f6] text-white font-semibold text-[15px] " +
    "shadow-[0_2px_12px_rgba(8,145,178,0.25)] hover:shadow-[0_4px_16px_rgba(8,145,178,0.35)] " +
    "hover:-translate-y-px active:translate-y-0 transition-all duration-150 " +
    "disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-2";

  const ghostBtn =
    "h-[52px] px-5 rounded-xl text-[14px] font-medium text-slate-600 hover:text-[#0f1f35] " +
    "hover:bg-slate-50 transition-all duration-150 flex items-center justify-center gap-2";

  const primarySni = bvData?.sniCodes?.[0];

  return (
    <AuthShell compact>
      <div className="hidden lg:flex items-center gap-0 mb-10">
        <span className="text-xl font-[800] text-[#3b82f6]">Ledger</span>
        <span className="text-xl font-[800] text-[#0f1f35]">.io</span>
      </div>

      <OnboardingProgress current={step} total={6} />

      {/* ============== Step 1 — Företag ============== */}
      {step === 1 && (
        <div key="s1" className="animate-fade-in">
          <h2 className="text-[24px] font-bold tracking-tight text-[#0f1f35]">
            Berätta om ditt företag
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Vi hämtar bolagsdata automatiskt från Bolagsverket.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 mb-5">
            <span>🇸🇪</span>
            <span className="text-[12px] font-medium text-slate-600">Sverige</span>
          </div>

          <div className="space-y-4">
            <AuthInput
              inputSize="lg"
              autoFocus
              placeholder="Företagsnamn"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <div className="relative">
              <AuthInput
                inputSize="lg"
                placeholder="Organisationsnummer (XXXXXX-XXXX)"
                value={orgNumber}
                onChange={(e) => handleOrgChange(e.target.value)}
                inputMode="numeric"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {lookingUp && <Loader2 className="w-4 h-4 animate-spin text-[#3b82f6]" />}
                {lookupDone && !lookingUp && cleanOrg.length === 10 && (
                  <CheckCircle2 className="w-4 h-4 text-[#3b82f6]" />
                )}
              </div>
            </div>

            {alreadyRegistered && (
              <div className="rounded-xl border border-[#F0DDB7] bg-[#FAEEDA] p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#7A5417] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[#7A5417]">
                      {alreadyRegistered.name} är redan registrerat på Ledger.io
                    </p>
                    <p className="text-[13px] text-[#7A5417] mt-1">
                      Begär åtkomst från en befintlig administratör för att gå med.
                    </p>
                    <button
                      type="button"
                      onClick={requestAccessToExisting}
                      className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7A5417] hover:text-[#7A5417]"
                    >
                      Begär åtkomst <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bvData && !alreadyRegistered && bvData.source === "bolagsverket" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#3b82f6]" />
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-[#3b82f6]">
                    Hämtat från Bolagsverket
                  </span>
                </div>
                <dl className="text-[13px] text-slate-700 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
                  {companyAddress && (
                    <>
                      <dt className="text-slate-500">Adress</dt>
                      <dd>{companyAddress}{bvData.postalCode ? `, ${bvData.postalCode}` : ""} {bvData.city || ""}</dd>
                    </>
                  )}
                  {bvData.registrationDate && (
                    <>
                      <dt className="text-slate-500">Registrerad</dt>
                      <dd>{bvData.registrationDate}</dd>
                    </>
                  )}
                  {primarySni && (
                    <>
                      <dt className="text-slate-500">Bransch (SNI)</dt>
                      <dd>{primarySni.code} – {primarySni.description}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            <button
              type="button"
              onClick={createCompanyAndAdvance}
              disabled={!companyName.trim() || cleanOrg.length !== 10 || submitting || !!alreadyRegistered}
              className={primaryBtn}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Skapar…" : "Fortsätt"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>

            {TEST_ACCOUNT_WHITELIST.includes((user?.email || "").toLowerCase()) && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={createTestAccountAndAdvance}
                  disabled={submitting}
                  className="text-[13px] text-slate-500 hover:text-[#3b82f6] underline underline-offset-2 disabled:opacity-50"
                >
                  Hoppa över – skapa testkonto utan org-nummer
                </button>
                <p className="mt-1 text-[11px] text-slate-400">
                  Internt testkonto – endast för whitelistade användare.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============== Step 2 — KYC (AML) ============== */}
      {step === 2 && (
        <div key="s2" className="animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-[#3b82f6]" />
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#3b82f6]">
              Steg 2 av 6 · KYC-verifiering (penningtvättslagen)
            </span>
          </div>
          <h2 className="text-[24px] font-bold tracking-tight text-[#0f1f35]">
            Verifiera ditt företag
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Lag (2017:630). Krävs för alla finansiella tjänster i Sverige. Tar ca 2 min.
            <span className="block mt-1 text-[12px] text-slate-400">
              Signering med BankID sker samlat i sista steget.
            </span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Momsregistreringsnummer <span className="text-slate-400 font-normal">(valfritt)</span>
              </label>
              <AuthInput
                inputSize="lg"
                placeholder="SE556677889901"
                value={kycVatNumber}
                onChange={(e) => setKycVatNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Verksamhetsbeskrivning *
              </label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-slate-200 px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6]"
                placeholder="Beskriv kort vad ditt företag gör"
                value={kycDescription}
                onChange={(e) => setKycDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Syfte med affärsrelationen *
              </label>
              <AuthInput
                inputSize="lg"
                placeholder="T.ex. löpande bokföring, momsdeklaration, lönehantering"
                value={kycPurpose}
                onChange={(e) => setKycPurpose(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Förväntad årsomsättning (SEK) <span className="text-slate-400 font-normal">(valfritt)</span>
              </label>
              <AuthInput
                inputSize="lg"
                placeholder="T.ex. 2 500 000"
                inputMode="numeric"
                value={kycExpectedTurnover}
                onChange={(e) => setKycExpectedTurnover(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <p className="text-[13px] font-semibold text-[#0f1f35]">Verklig huvudman *</p>
              <p className="text-[12px] text-slate-500 -mt-2">
                Person som äger ≥ 25 % eller har bestämmande inflytande (Lag 2017:631).
              </p>
              <AuthInput
                inputSize="lg"
                placeholder="För- och efternamn"
                value={kycBeneficialOwner}
                onChange={(e) => setKycBeneficialOwner(e.target.value)}
              />
              <AuthInput
                inputSize="lg"
                placeholder="Personnummer (YYYYMMDD-XXXX)"
                value={kycBeneficialPersonnummer}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                  const formatted = digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
                  setKycBeneficialPersonnummer(formatted);
                }}
                inputMode="numeric"
                maxLength={13}
              />
              <AuthInput
                inputSize="lg"
                placeholder="Ägarandel i % (25–100)"
                inputMode="numeric"
                value={kycOwnershipPct ? `${kycOwnershipPct} %` : ""}
                onChange={(e) => setKycOwnershipPct(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <p className="text-[13px] font-semibold text-[#0f1f35]">Riskbedömning *</p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#3b82f6]"
                  checked={kycCashIntensive}
                  onChange={(e) => setKycCashIntensive(e.target.checked)}
                />
                <span className="text-[13px] text-slate-700">
                  Verksamheten hanterar betydande kontantbetalningar
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#3b82f6]"
                  checked={kycInternational}
                  onChange={(e) => setKycInternational(e.target.checked)}
                />
                <span className="text-[13px] text-slate-700">
                  Bolaget har transaktioner med kunder/leverantörer utanför EU/EES
                </span>
              </label>

              <div className="pt-1">
                <p className="text-[13px] text-slate-700 mb-2">
                  Är verklig huvudman en person i politiskt utsatt ställning (PEP)? *
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setKycPep("no")}
                    className={`flex-1 h-10 rounded-lg text-[13px] font-medium border transition-all ${
                      kycPep === "no" ? "bg-[#3b82f6] text-white border-[#3b82f6]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Nej
                  </button>
                  <button
                    type="button"
                    onClick={() => setKycPep("yes")}
                    className={`flex-1 h-10 rounded-lg text-[13px] font-medium border transition-all ${
                      kycPep === "yes" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Ja
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#3b82f6]"
                  checked={kycSanctionsConfirmed}
                  onChange={(e) => setKycSanctionsConfirmed(e.target.checked)}
                />
                <span className="text-[13px] text-slate-700">
                  Jag bekräftar att bolaget och verklig huvudman inte finns på sanktionslistor (EU/FN/OFAC)
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className={ghostBtn}>
                <ArrowLeft className="w-4 h-4" />
                Tillbaka
              </button>
              <button
                type="button"
                onClick={submitKYC}
                disabled={kycSubmitting}
                className={primaryBtn}
              >
                {kycSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {kycSubmitting ? "Sparar…" : "Spara & fortsätt"}
                {!kycSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {/* BankID-signering sker samlat i steg 5 — ingen separat dialog här */}

        </div>
      )}

      {/* ============== Step 3 — Bank ============== */}
      {step === 3 && (
        <div key="s3" className="animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-5 h-5 text-[#3b82f6]" />
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#3b82f6]">
              Steg 3 av 6 · Bankkoppling
            </span>
          </div>
          <h2 className="text-[24px] font-bold tracking-tight text-[#0f1f35]">
            Koppla din företagsbank
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Krävs för att aktivera AI-bokföring, automatisk avstämning och betalningar.
          </p>

          {bankAccountCount > 0 ? (
            <div className="rounded-xl border border-[#BFE6D6] bg-[#E1F5EE] p-4 mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#085041]" />
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#085041]">
                  Bank kopplad ({bankAccountCount} konto{bankAccountCount > 1 ? "n" : ""})
                </p>
                <p className="text-[13px] text-[#085041]">
                  AI-bokföringen kan nu hämta dina transaktioner.
                </p>
              </div>
            </div>
          ) : (
            createdCompanyId && (
              <div className="mb-4">
                <BankLinking
                  companyId={createdCompanyId}
                  flow="onboarding"
                  onSuccess={async () => {
                    if (!createdCompanyId) return;
                    const { count } = await supabase
                      .from("bank_accounts")
                      .select("id", { count: "exact", head: true })
                      .eq("company_id", createdCompanyId);
                    setBankAccountCount(count ?? 0);
                  }}
                />
              </div>
            )
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(2)} className={ghostBtn}>
              <ArrowLeft className="w-4 h-4" />
              Tillbaka
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={bankAccountCount === 0}
              className={primaryBtn}
            >
              Fortsätt
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={skipBankTemporarily}
            className="w-full text-center mt-4 text-[13px] text-slate-400 hover:text-slate-600 underline-offset-4 hover:underline"
          >
            Hoppa över tillfälligt — gör senare
          </button>
        </div>
      )}

      {/* ============== Step 4 — Fokus ============== */}
      {step === 4 && (
        <div key="s4" className="animate-fade-in">
          {/* Bankanslutningsbekräftelse */}
          {(connectedBankAccounts.length > 0 || searchParams.get("bank") === "success") && (
            <div className="mb-6 rounded-xl border border-[#BFE6D6] bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-[#085041]" />
                <span className="text-[13px] font-semibold text-[#085041]">
                  {connectedBankAccounts.length > 0
                    ? `${connectedBankAccounts.length} bankkonto${connectedBankAccounts.length !== 1 ? "n" : ""} anslutna`
                    : "Bankanslutning bekräftad"}
                </span>
              </div>
              {connectedBankAccounts.length === 0 ? (
                <div className="flex items-center gap-2 text-[12px] text-emerald-800/80">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Hämtar kontosaldon från Enable Banking…
                </div>
              ) : (
                <ul className="space-y-2">
                  {connectedBankAccounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-lg bg-white border border-emerald-100 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0f1f35] truncate">
                          {a.account_name || "Konto"}
                          <span className="ml-2 text-[11px] text-slate-500 font-normal">
                            {a.bank_name || ""}
                          </span>
                        </p>
                        {a.iban && (
                          <p className="text-[11px] text-slate-500 font-mono truncate">{a.iban}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {a.balance !== null ? (
                          <p className="text-[14px] font-semibold tabular-nums text-[#0f1f35]">
                            {Number(a.balance).toLocaleString("sv-SE", { maximumFractionDigits: 2 })}{" "}
                            <span className="text-[11px] text-slate-500 font-normal">
                              {a.currency || "SEK"}
                            </span>
                          </p>
                        ) : bankConnectedAt && (Date.now() - bankConnectedAt) < 15000 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Hämtar saldo…
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Saldo ej tillgängligt</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {connectedBankAccounts.length > 0 && connectedBankAccounts.some((a) => a.balance === null) && (!bankConnectedAt || (Date.now() - bankConnectedAt) >= 15000) && (
                <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-emerald-800/80">
                  <span>Saldo synkas i bakgrunden — du kan fortsätta nu.</span>
                  <button
                    type="button"
                    onClick={retryBalanceFetch}
                    disabled={refreshingBalance}
                    className="inline-flex items-center gap-1 rounded-md border border-[#BFE6D6] bg-white px-2 py-1 text-[11px] font-medium text-[#085041] hover:bg-[#E1F5EE] disabled:opacity-50"
                  >
                    {refreshingBalance && <Loader2 className="w-3 h-3 animate-spin" />}
                    Försök igen
                  </button>
                </div>
              )}
            </div>
          )}

          <h2 className="text-[24px] font-bold tracking-tight text-[#0f1f35]">
            Vad vill du göra först?
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Vi anpassar din plattform efter ditt fokus.
          </p>

          <FocusGoalPicker value={focusGoal} onChange={setFocusGoal} />

          <div className="flex gap-3 pt-6">
            <button type="button" onClick={() => setStep(3)} className={ghostBtn}>
              <ArrowLeft className="w-4 h-4" />
              Tillbaka
            </button>
            <button
              type="button"
              onClick={handleFocusContinue}
              disabled={!focusGoal}
              className={primaryBtn}
            >
              Fortsätt
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============== Step 5 — Samlad signering (KYC + avtal av firmatecknare) ============== */}
      {step === 5 && (
        <div key="s5" className="animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <FileSignature className="w-5 h-5 text-[#3b82f6]" />
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#3b82f6]">
              Steg 5 av 6 · Signera allt med BankID
            </span>
          </div>
          <h2 className="text-[24px] font-bold tracking-tight text-[#0f1f35]">
            Signera kundavtal & KYC
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            En enda signering med BankID slutför både KYC-deklarationen (penningtvättslagen)
            och kundavtalet. Måste utföras av en behörig firmatecknare.
          </p>

          {/* Firmatecknare från Bolagsverket */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[#3b82f6]">
                Firmatecknare enligt Bolagsverket
              </span>
            </div>

            {signatoriesLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Hämtar firmatecknare…
              </div>
            ) : signatories.length > 0 ? (
              <>
                {signatoryRule && (
                  <p className="text-[12px] text-slate-600 mb-2">
                    <span className="font-medium text-[#0f1f35]">Teckningsregel:</span> {signatoryRule}
                  </p>
                )}
                <ul className="space-y-1.5">
                  {signatories.slice(0, 8).map((p, i) => (
                    <li key={i} className="text-[13px] text-slate-700 flex items-center justify-between">
                      <span className="font-medium text-[#0f1f35]">{p.name || "—"}</span>
                      <span className="text-[12px] text-slate-500">{p.role || ""}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-[13px] text-slate-600 space-y-1">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#7A5417] flex-shrink-0 mt-0.5" />
                  <p>
                    Vi kunde inte hämta firmatecknare automatiskt
                    {signatorySource === "unavailable"
                      ? " (Bolagsverkets betalda API krävs för full data)"
                      : ""}.
                    Bekräfta nedan att du är behörig att teckna firman.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Avtalstext */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4 max-h-[200px] overflow-y-auto text-[13px] text-slate-700 leading-relaxed space-y-3">
            <p className="font-semibold text-[#0f1f35]">Kundavtal Ledger.io – version 2025-01</p>
            <p>
              Detta avtal ingås mellan {companyName || "kunden"} (org.nr {orgNumber || "—"})
              och Ledger.io AB. Avtalet ger kunden rätt att använda plattformen för bokföring,
              fakturering, momsdeklaration, lönehantering och relaterade tjänster.
            </p>
            <p>
              <span className="font-semibold">1. Tjänster.</span> Molnbaserad plattform med AI-stöd
              för svensk redovisning enligt BAS, K2/K3 och gällande lagstiftning (BFL, ÅRL, ML).
            </p>
            <p>
              <span className="font-semibold">2. GDPR.</span> Ledger.io agerar
              personuppgiftsbiträde åt kunden. Personuppgifter lagras inom EU/EES.
            </p>
            <p>
              <span className="font-semibold">3. Penningtvätt.</span> Kunden bekräftar att
              KYC-uppgifterna är korrekta enligt lag (2017:630).
            </p>
            <p>
              <span className="font-semibold">4. Avgifter.</span> Pris enligt vald prenumeration.
              Uppsägning kan ske månadsvis.
            </p>
            <p>
              Fullständigt avtal:{" "}
              <a href="/legal/customer-agreement" target="_blank" rel="noreferrer" className="text-[#3b82f6] underline">
                ledger.io/legal/customer-agreement
              </a>.
            </p>
            <p className="text-[12px] text-slate-500 leading-relaxed pt-1 border-t border-slate-200/70 mt-2">
              <span className="font-semibold text-slate-600">Prisjustering.</span> Priserna justeras årligen
              den 1 januari enligt KPI. Vid förlängning av avtalsperioden kan ytterligare marknadsjustering ske
              med 90 dagars varsel; om höjningen utöver KPI överstiger 10 % har Kunden rätt att säga upp
              avtalet utan kostnad till ny periods början.
            </p>
          </div>

          {/* Signerarens namn */}
          <div className="mb-3">
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Ditt namn (signerare) *
            </label>
            <AuthInput
              inputSize="lg"
              placeholder="För- och efternamn"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </div>

          {/* Bekräftelse av behörighet */}
          <label className="flex items-start gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#3b82f6]"
              checked={signerIsAuthorized}
              onChange={(e) => setSignerIsAuthorized(e.target.checked)}
            />
            <span className="text-[13px] text-slate-700">
              Jag intygar att jag är <span className="font-semibold">behörig firmatecknare</span> för
              {" "}{companyName || "bolaget"} och har rätt att signera detta avtal samt KYC-deklarationen
              i enlighet med Bolagsverkets registrerade teckningsregel.
            </span>
          </label>

          {/* Avtalsgodkännande */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#3b82f6]"
              checked={agreementAccepted}
              onChange={(e) => setAgreementAccepted(e.target.checked)}
            />
            <span className="text-[13px] text-slate-700">
              Jag har läst och godkänner kundavtalet,{" "}
              <a href="/legal/privacy" target="_blank" rel="noreferrer" className="text-[#3b82f6] underline">
                integritetspolicyn
              </a>{" "}
              och{" "}
              <a href="/legal/dpa" target="_blank" rel="noreferrer" className="text-[#3b82f6] underline">
                personuppgiftsbiträdesavtalet
              </a>
              , samt KYC-deklarationen enligt penningtvättslagen.
            </span>
          </label>

          {/* Co-signer block — visas bara vid "två i förening" */}
          {requiresCoSigner && (
            <div className="rounded-xl border border-[#F0DDB7] bg-amber-50/60 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[#7A5417]" />
                <span className="text-[13px] font-semibold text-[#7A5417]">
                  Medsignerare krävs ({parsedRule.humanLabel.toLowerCase()})
                </span>
              </div>
              <p className="text-[12px] text-[#7A5417] mb-3">
                Bolaget tecknas av två i förening. Kontot aktiveras direkt efter din signatur,
                men skarpa betalningar och myndighetsinlämningar låses tills medsigneraren signerat.
                Vi mailar en BankID-länk.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <AuthInput
                  inputSize="lg"
                  placeholder="Medsignerarens namn"
                  value={coSignerName}
                  onChange={(e) => setCoSignerName(e.target.value)}
                />
                <AuthInput
                  inputSize="lg"
                  type="email"
                  placeholder="Medsignerarens e-post"
                  value={coSignerEmail}
                  onChange={(e) => setCoSignerEmail(e.target.value)}
                />
                <textarea
                  placeholder="Valfri hälsning (visas i mailet)"
                  value={coSignerMessage}
                  onChange={(e) => setCoSignerMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30"
                />
              </div>
            </div>
          )}

          {parsedRule.needsManualReview && (
            <div className="rounded-xl border border-[#F0DDB7] bg-amber-50/60 p-3 mb-4 text-[12px] text-[#7A5417] flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Vi kunde inte tolka teckningsregeln automatiskt. Du slutför med en signatur —
                du intygar då personligen att du har behörighet (loggas i revisionsspåret).
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(4)} className={ghostBtn}>
              <ArrowLeft className="w-4 h-4" />
              Tillbaka
            </button>
            <button
              type="button"
              onClick={() => setAgreementBankIdOpen(true)}
              disabled={!canFinalize}
              className={primaryBtn}
            >
              {completing && <Loader2 className="w-4 h-4 animate-spin" />}
              {completing
                ? "Signerar…"
                : requiresCoSigner
                ? "Signera och bjud in medsignerare"
                : "Signera allt med BankID"}
              {!completing && <ShieldCheck className="w-4 h-4" />}
            </button>
          </div>

          <BankIDDemoDialog
            open={agreementBankIdOpen}
            onOpenChange={setAgreementBankIdOpen}
            title="Signera KYC + kundavtal"
            description={`Du signerar både KYC-deklarationen och kundavtalet för ${companyName || "ditt bolag"} (avtalsversion 2025-01) som behörig firmatecknare.`}
            onComplete={finalizeAgreement}
          />
        </div>
      )}


      {/* ============== Step 6 — Klar ============== */}
      {step === 6 && (
        <div key="s6" className="animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mb-6">
            <Check className="w-7 h-7 text-[#3b82f6]" strokeWidth={2.5} />
          </div>

          <h2 className="text-[24px] font-bold tracking-tight text-[#0f1f35]">
            Din plattform är aktiverad
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-2">
            {companyName ? `${companyName} · ` : ""}Redo att användas direkt.
          </p>
          {agreementSigned && (
            <p className="text-[12px] text-[#085041] inline-flex items-center gap-1 mb-6">
              <ShieldCheck className="w-3.5 h-3.5" /> Avtal signerat med BankID
            </p>
          )}

          <div className="space-y-3 mt-6">
            <button onClick={goToDashboard} className={primaryBtn}>
              Gå till din plattform
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={goToMigration}
              className="w-full h-[48px] rounded-xl text-[13px] font-medium text-slate-500 hover:text-[#3b82f6] hover:bg-slate-50 transition-all duration-150"
            >
              Importera från Fortnox / Visma →
            </button>
          </div>
        </div>
      )}

      <TrustBar />
    </AuthShell>
  );
};

export default QuickOnboarding;
