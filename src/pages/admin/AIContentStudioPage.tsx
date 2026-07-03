import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArticleInputForm, type GenerateInput } from "@/components/admin/content-studio/ArticleInputForm";
import { GeneratedArticlePreview } from "@/components/admin/content-studio/GeneratedArticlePreview";
import { ARTICLES } from "@/data/guides/articles";
import { COMPACT_GUIDES } from "@/data/guides/compact";
import type { Article } from "@/data/guides/articles/types";
import { articleToTsCode } from "@/lib/articleToTsCode";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface Generated { article: Article; tsCode: string }

const AIContentStudioPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Generated[]>([]);
  const [activeTab, setActiveTab] = useState("0");
  const [lastInput, setLastInput] = useState<GenerateInput | null>(null);

  const allSlugs = useMemo(() => [
    ...ARTICLES.map((a) => a.slug),
    ...COMPACT_GUIDES.map((g) => g.slug),
  ], []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      setIsAdmin(!!data && data.length > 0);
    })();
  }, [user, authLoading, navigate]);

  const handleGenerate = async (input: GenerateInput) => {
    setLoading(true);
    setLastInput(input);
    try {
      const { data, error } = await supabase.functions.invoke("generate-article", { body: input });
      if (error) throw error;
      const articles: Article[] = data?.articles || [];
      const tsFiles: { slug: string; code: string }[] = data?.tsFiles || [];
      const errors: any[] = data?.errors || [];

      if (articles.length === 0) throw new Error("AI returnerade inga artiklar");

      const generated: Generated[] = articles.map((a, i) => ({
        article: a,
        tsCode: tsFiles[i]?.code || articleToTsCode(a),
      }));
      setResults(generated);
      setActiveTab("0");

      if (errors.length > 0) {
        toast({
          title: `${articles.length} genererade — ${errors.length} med varningar`,
          description: "Granska validation-listan per artikel.",
        });
      } else {
        toast({ title: `${articles.length} artiklar genererade`, description: "Granska och kopiera TS-koden." });
      }
    } catch (e: any) {
      const msg = e?.message || "Generering misslyckades";
      toast({ title: "Fel", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isAdmin === null) {
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC]">
        <div className="rounded-2xl border border-slate-900/[0.06] bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[#7A5417]" />
          <h1 className="text-xl font-semibold text-slate-900">Endast administratörer</h1>
          <p className="mt-1 text-sm text-slate-600">Du saknar admin-roll för att använda Content Studio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="border-b border-slate-900/[0.06] bg-white">
        <div className="mx-auto max-w-[1600px] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#EFF6FF] p-2.5"><Sparkles className="h-5 w-5 text-[#3b82f6]" /></div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">AI Content Studio</h1>
              <p className="text-sm text-slate-600">Generera SEO-optimerade artiklar enligt master-mallen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        {/* Left: input */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-slate-900/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <ArticleInputForm allSlugs={allSlugs} loading={loading} onGenerate={handleGenerate} />
          </div>
        </aside>

        {/* Right: preview */}
        <main>
          {results.length === 0 && !loading && (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/40">
              <div className="text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">Fyll i topic + keyword och klicka <strong>Generera</strong></p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-900/[0.06] bg-white">
              <div className="text-center">
                <LoadingSpinner />
                <p className="mt-3 text-sm text-slate-600">AI skriver din artikel…</p>
                <p className="text-xs text-slate-400">Tar 20–60s per artikel</p>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                {results.map((r, i) => (
                  <TabsTrigger key={i} value={String(i)} className="text-xs">
                    {r.article.slug.length > 22 ? r.article.slug.slice(0, 22) + "…" : r.article.slug}
                  </TabsTrigger>
                ))}
              </TabsList>
              {results.map((r, i) => (
                <TabsContent key={i} value={String(i)}>
                  <GeneratedArticlePreview
                    article={r.article}
                    tsCode={r.tsCode}
                    onRegenerate={lastInput ? () => handleGenerate(lastInput) : undefined}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
};

export default AIContentStudioPage;
