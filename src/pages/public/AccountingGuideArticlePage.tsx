import { useParams, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getGuideBySlug } from "@/data/guides/compact";
import { MasterArticleTemplate } from "@/components/article/MasterArticleTemplate";
import { CompactGuideRenderer } from "@/components/guides/CompactGuideRenderer";

export default function AccountingGuideArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? getGuideBySlug(slug) : undefined;

  if (!guide) return <Navigate to="/resources/accounting-guides" replace />;

  const canonicalPath = `/resources/accounting-guides/${slug}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFC]">
      <Header lightBg />
      <main className="flex-1 bg-[#FAFBFC]">
        {guide.kind === "article" ? (
          <MasterArticleTemplate article={guide.data} canonicalPath={canonicalPath} />
        ) : (
          <CompactGuideRenderer guide={guide.data} canonicalPath={canonicalPath} />
        )}
      </main>
      <Footer />
    </div>
  );
}
