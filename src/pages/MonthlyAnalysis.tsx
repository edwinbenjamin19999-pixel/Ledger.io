import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, FileText, Copy, Share2, Download, RefreshCw, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS_SV = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

type SectionKey = "sammanfattning" | "intakter" | "kostnader" | "resultat" | "likviditet" | "framatblick";

const SECTION_LABELS: Record<SectionKey, string> = {
  sammanfattning: "Sammanfattning",
  intakter: "Intäkter",
  kostnader: "Kostnader",
  resultat: "Resultat & marginal",
  likviditet: "Likviditet & balans",
  framatblick: "Framåtblick",
};

interface Commentary {
  id: string;
  company_id: string;
  period_year: number;
  period_month: number;
  sections: Record<SectionKey, string>;
  metrics: any;
  share_token: string | null;
}

function defaultPeriod() {
  const now = new Date();
  // default to prior month
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function MonthlyAnalysis() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const sharedToken = search.get("share");

  const [companyId, setCompanyId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null,
  );
  const [companyName, setCompanyName] = useState<string>("");

  const initial = defaultPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);

  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [loading, setLoading] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<SectionKey | null>(null);
  const [readonly, setReadonly] = useState(false);

  // Load shared
  useEffect(() => {
    if (!sharedToken) return;
    (async () => {
      const { data, error } = await supabase
        .from("monthly_commentaries")
        .select("*")
        .eq("share_token", sharedToken)
        .maybeSingle();
      if (error || !data) {
        toast.error("Delad analys hittades inte");
        return;
      }
      setCommentary(data as any);
      setReadonly(true);
    })();
  }, [sharedToken]);

  // Load existing for selected period
  useEffect(() => {
    if (sharedToken || !companyId) return;
    (async () => {
      const { data } = await supabase
        .from("monthly_commentaries")
        .select("*")
        .eq("company_id", companyId)
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();
      setCommentary((data as any) || null);
    })();
  }, [companyId, year, month, sharedToken]);

  useEffect(() => {
    if (!companyId) return;
    supabase.from("companies").select("name").eq("id", companyId).maybeSingle()
      .then(({ data }) => setCompanyName(data?.name || ""));
  }, [companyId]);

  const generate = async (section?: SectionKey) => {
    if (!companyId) {
      toast.error("Välj ett företag först");
      return;
    }
    if (section) setRegeneratingSection(section);
    else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-monthly-commentary", {
        body: {
          company_id: companyId,
          year,
          month,
          section: section || null,
          existing_sections: section ? commentary?.sections : null,
        },
      });
      if (error) throw error;
      setCommentary(data.commentary);
      toast.success(section ? `${SECTION_LABELS[section]} uppdaterad` : "Månadsanalys genererad");
    } catch (e: any) {
      const msg = e?.context?.error || e?.message || "Något gick fel";
      toast.error(msg);
    } finally {
      setLoading(false);
      setRegeneratingSection(null);
    }
  };

  const updateSection = async (key: SectionKey, value: string) => {
    if (!commentary) return;
    const next = { ...commentary.sections, [key]: value };
    setCommentary({ ...commentary, sections: next });
    await supabase.from("monthly_commentaries").update({ sections: next }).eq("id", commentary.id);
  };

  const createShareLink = async () => {
    if (!commentary) return;
    let token = commentary.share_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "");
      const { error } = await supabase
        .from("monthly_commentaries")
        .update({ share_token: token, shared_at: new Date().toISOString() })
        .eq("id", commentary.id);
      if (error) {
        toast.error("Kunde inte skapa länk");
        return;
      }
      setCommentary({ ...commentary, share_token: token });
    }
    const url = `${window.location.origin}/manadsanalys/delad?share=${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Delningslänk kopierad");
  };

  const copyAsText = async () => {
    if (!commentary) return;
    const text = (Object.keys(SECTION_LABELS) as SectionKey[])
      .map(k => `${SECTION_LABELS[k]}\n${commentary.sections[k] || ""}`)
      .join("\n\n");
    await navigator.clipboard.writeText(`Månadsanalys ${MONTHS_SV[month - 1]} ${year}\n${companyName}\n\n${text}`);
    toast.success("Kopierat till urklipp");
  };

  const exportPDF = () => {
    if (!commentary) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 18;
    let y = margin;
    doc.setFontSize(18);
    doc.text(`Månadsanalys – ${MONTHS_SV[month - 1]} ${year}`, margin, y); y += 8;
    if (companyName) {
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(companyName, margin, y); y += 8;
      doc.setTextColor(0);
    }
    (Object.keys(SECTION_LABELS) as SectionKey[]).forEach(k => {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.setFontSize(13);
      doc.text(SECTION_LABELS[k], margin, y); y += 6;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(commentary.sections[k] || "—", 175);
      lines.forEach((ln: string) => {
        if (y > 280) { doc.addPage(); y = margin; }
        doc.text(ln, margin, y); y += 5;
      });
      y += 4;
    });
    doc.save(`manadsanalys-${year}-${String(month).padStart(2, "0")}.pdf`);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {!readonly && (
        <PageHeader
          title="Månadsanalys"
          subtitle="AI-genererad ledningskommentar för månaden"
          icon={FileText}
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Rapporter
            </Button>
          }
        />
      )}

      {!readonly && (
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Månad</label>
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_SV.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">År</label>
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => generate()} disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Jag analyserar {MONTHS_SV[month - 1]}s siffror…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> {commentary ? "Generera om" : `Generera månadsanalys för ${MONTHS_SV[month - 1]}`}</>
              )}
            </Button>
            {commentary && (
              <>
                <Button variant="outline" onClick={copyAsText}><Copy className="h-4 w-4 mr-2" /> Kopiera</Button>
                <Button variant="outline" onClick={exportPDF}><Download className="h-4 w-4 mr-2" /> PDF</Button>
                <Button variant="outline" onClick={createShareLink}><Share2 className="h-4 w-4 mr-2" /> Dela</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!commentary && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ingen analys finns för {MONTHS_SV[month - 1]} {year} ännu. Klicka på "Generera" ovan.
          </CardContent>
        </Card>
      )}

      {commentary && (
        <div className="space-y-4">
          {readonly && (
            <div className="text-sm text-muted-foreground">
              Skrivskyddad delad vy · {companyName} · {MONTHS_SV[commentary.period_month - 1]} {commentary.period_year}
            </div>
          )}
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map(key => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{SECTION_LABELS[key]}</CardTitle>
                {!readonly && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => generate(key)}
                    disabled={regeneratingSection === key}
                  >
                    {regeneratingSection === key
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {readonly ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{commentary.sections[key] || "—"}</p>
                ) : (
                  <Textarea
                    value={commentary.sections[key] || ""}
                    onChange={e => setCommentary({ ...commentary, sections: { ...commentary.sections, [key]: e.target.value } })}
                    onBlur={e => updateSection(key, e.target.value)}
                    rows={key === "sammanfattning" ? 4 : 5}
                    className="text-sm leading-relaxed resize-none border-0 focus-visible:ring-1 px-0"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
