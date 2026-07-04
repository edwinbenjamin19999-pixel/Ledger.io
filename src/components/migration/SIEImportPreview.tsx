import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Building2, CheckCircle2, AlertTriangle, XCircle, Sparkles,
  FileSpreadsheet, ChevronDown, ChevronUp, Loader2, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MappingItem {
  account_number: string;
  account_name: string;
  mapped_row_code: string | null;
  mapped_row_id: string | null;
  confidence: number;
  source: "rule" | "sru" | "history" | "ai" | "user" | "unmapped";
  reason: string;
}

export interface SIEPreviewData {
  sessionId: string;
  status: "previewed" | "blocked" | string;
  parsedSummary: {
    accounts: number;
    verifications: number;
    transactions: number;
    fiscalYears: Array<{ index: number; start: string; end: string }>;
    program?: string;
    sieType?: number;
    encoding?: string;
    stats: {
      totalRevenue: number;
      totalCosts: number;
      totalAssets: number;
      totalLiabilities: number;
      revenueAccountsCount: number;
      costAccountsCount: number;
      assetAccountsCount: number;
      liabilityAccountsCount: number;
    };
  };
  validation: {
    blockers: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
  };
  mappings: MappingItem[];
  mappingSummary: { total: number; auto: number; review: number; manual: number };
  company: {
    fileOrgNumber?: string | null;
    fileCompanyName?: string | null;
    expectedOrgNumber?: string | null;
    expectedCompanyName?: string | null;
  };
}

interface Props {
  data: SIEPreviewData;
  fileContentBase64: string;
  onCommitted: (result?: any) => void;
  onCancel: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

export const SIEImportPreview = ({ data, fileContentBase64, onCommitted, onCancel }: Props) => {
  const [committing, setCommitting] = useState(false);
  const [showReviewList, setShowReviewList] = useState(false);

  const { parsedSummary, validation, mappingSummary, mappings, company } = data;
  const hasBlockers = validation.blockers.length > 0;

  const reviewList = useMemo(
    () => mappings.filter((m) => m.confidence < 0.9).sort((a, b) => a.confidence - b.confidence),
    [mappings],
  );

  const handleCommit = async () => {
    if (hasBlockers) {
      toast.error("Lös blockerande fel innan du importerar.");
      return;
    }
    setCommitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("import-sie4", {
        body: { action: "commit", sessionId: data.sessionId, fileContentBase64 },
      });
      if (error) throw error;
      if (result?.success === false) throw new Error(result.error ?? "Importen misslyckades");
      if (result?.error) throw new Error(result.error);
      const s = result?.summary ?? {};
      if (s.alreadyImported || result?.alreadyImported) {
        toast.info(s.message ?? result?.message ?? "Filen är redan importerad.");
      } else {
        toast.success(
          `Import klar! ${s.accounts ?? 0} konton, ${s.verifications ?? 0} verifikationer, ${s.transactionLines ?? 0} rader.`,
        );
      }
      // Pass real persisted counts + mappings up so wizard advances with truth, not parse-only state.
      (onCommitted as any)({
        committed: true,
        accounts: s.accounts ?? 0,
        verifications: s.verifications ?? 0,
        transactionLines: s.transactionLines ?? 0,
        openingBalances: s.balances ?? 0,
        alreadyImported: s.alreadyImported ?? result?.alreadyImported ?? false,
        mappings,
        errors: [],
      });
    } catch (e: any) {
      toast.error(e.message ?? "Commit misslyckades");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Company card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Företag i filen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Företagsnamn</p>
            <p className="font-medium">{company.fileCompanyName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Org-nr</p>
            <p className="font-mono">{company.fileOrgNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Period</p>
            <p className="font-medium">
              {parsedSummary.fiscalYears[0]
                ? `${parsedSummary.fiscalYears[0].start} – ${parsedSummary.fiscalYears[0].end}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">SIE-typ</p>
            <Badge variant="outline">SIE{parsedSummary.sieType ?? "?"}</Badge>
            {parsedSummary.program && (
              <span className="ml-2 text-xs text-muted-foreground">från {parsedSummary.program}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Innehåll</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Konton", value: parsedSummary.accounts },
              { label: "Verifikationer", value: parsedSummary.verifications },
              { label: "Transaktioner", value: parsedSummary.transactions },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold">{fmt(s.value)}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Intäkter</p>
              <p className="font-semibold text-[#085041]">{fmt(parsedSummary.stats.totalRevenue)} kr</p>
              <p className="text-[10px] text-muted-foreground">{parsedSummary.stats.revenueAccountsCount} konton</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Kostnader</p>
              <p className="font-semibold text-[#7A1A1A]">{fmt(parsedSummary.stats.totalCosts)} kr</p>
              <p className="text-[10px] text-muted-foreground">{parsedSummary.stats.costAccountsCount} konton</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Tillgångar</p>
              <p className="font-semibold">{fmt(parsedSummary.stats.totalAssets)} kr</p>
              <p className="text-[10px] text-muted-foreground">{parsedSummary.stats.assetAccountsCount} konton</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Skulder</p>
              <p className="font-semibold">{fmt(parsedSummary.stats.totalLiabilities)} kr</p>
              <p className="text-[10px] text-muted-foreground">{parsedSummary.stats.liabilityAccountsCount} konton</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapping confidence card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AI-mappning</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[#E1F5EE] dark:bg-emerald-950/30 p-3">
              <p className="text-xl font-bold text-[#085041] dark:text-[#1D9E75]">
                {mappingSummary.auto}
              </p>
              <p className="text-[11px] text-muted-foreground">Auto-mappade</p>
            </div>
            <div className="rounded-lg bg-[#FAEEDA] dark:bg-amber-950/30 p-3">
              <p className="text-xl font-bold text-[#7A5417] dark:text-[#C28A2B]">
                {mappingSummary.review}
              </p>
              <p className="text-[11px] text-muted-foreground">Behöver granskning</p>
            </div>
            <div className="rounded-lg bg-[#FCE8E8] dark:bg-rose-950/30 p-3">
              <p className="text-xl font-bold text-[#7A1A1A] dark:text-[#C73838]">
                {mappingSummary.manual}
              </p>
              <p className="text-[11px] text-muted-foreground">Saknar mappning</p>
            </div>
          </div>
          <Progress
            value={mappingSummary.total > 0 ? (mappingSummary.auto / mappingSummary.total) * 100 : 0}
            className="h-2"
          />
          {reviewList.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowReviewList((s) => !s)}
            >
              {showReviewList ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showReviewList ? "Dölj" : "Visa"} {reviewList.length} konton som behöver granskning
            </Button>
          )}
          {showReviewList && (
            <div className="space-y-1 max-h-72 overflow-auto rounded-md border p-2">
              {reviewList.map((m) => (
                <div
                  key={m.account_number}
                  className="flex items-center justify-between gap-2 text-xs py-1 border-b last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-medium">
                      {m.account_number} <span className="text-muted-foreground">{m.account_name}</span>
                    </p>
                    <p className="text-muted-foreground truncate">
                      → {m.mapped_row_code ?? "ej mappad"} · {m.reason}
                    </p>
                  </div>
                  <Badge
                    variant={m.confidence === 0 ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {Math.round(m.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Validering</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {validation.blockers.length === 0 && validation.warnings.length === 0 && (
            <Alert className="bg-[#E1F5EE] dark:bg-emerald-950/30 border-[#BFE6D6]">
              <CheckCircle2 className="h-4 w-4 text-[#085041]" />
              <AlertDescription className="text-sm text-[#085041] dark:text-emerald-200">
                Alla kontroller godkända.
              </AlertDescription>
            </Alert>
          )}
          {validation.blockers.map((b, i) => (
            <Alert key={`b-${i}`} variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{b.message}</AlertDescription>
            </Alert>
          ))}
          {validation.warnings.slice(0, 5).map((w, i) => (
            <Alert key={`w-${i}`} className="bg-[#FAEEDA] dark:bg-amber-950/30 border-[#F0DDB7]">
              <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
              <AlertDescription className="text-sm text-[#7A5417] dark:text-amber-200">
                {w.message}
              </AlertDescription>
            </Alert>
          ))}
          {validation.warnings.length > 5 && (
            <p className="text-xs text-muted-foreground">
              + {validation.warnings.length - 5} fler varningar
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 sticky bottom-0 bg-background pt-3 pb-1 -mx-1 px-1">
        <Button variant="outline" onClick={onCancel} disabled={committing} className="flex-1">
          Avbryt
        </Button>
        <Button
          onClick={handleCommit}
          disabled={hasBlockers || committing}
          className="flex-1"
        >
          {committing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importerar...
            </>
          ) : (
            <>Bekräfta & importera</>
          )}
        </Button>
      </div>
    </div>
  );
};
