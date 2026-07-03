import { useEffect } from "react";

interface ArticleSEOProps {
  title: string;
  description: string;
  canonicalPath: string;
  jsonLd: object[];
}

/**
 * Lightweight SEO injector — sets <title>, meta description,
 * canonical, OG/Twitter tags, and JSON-LD blocks. Cleans up on unmount.
 */
export const ArticleSEO = ({ title, description, canonicalPath, jsonLd }: ArticleSEOProps) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const tags: HTMLElement[] = [];

    const setMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      const created = !el;
      if (!el) {
        el = document.createElement(selector.startsWith("link") ? "link" : "meta");
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
      if (created) tags.push(el);
    };

    const url = `https://bokfy.se${canonicalPath}`;
    setMeta('meta[name="description"]', { name: "description", content: description });
    setMeta('link[rel="canonical"]', { rel: "canonical", href: url });
    setMeta('meta[property="og:title"]', { property: "og:title", content: title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: description });
    setMeta('meta[property="og:url"]', { property: "og:url", content: url });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "article" });
    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });

    const scripts: HTMLScriptElement[] = jsonLd.map((data) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.text = JSON.stringify(data);
      s.dataset.articleSeo = "1";
      document.head.appendChild(s);
      return s;
    });

    return () => {
      document.title = previousTitle;
      scripts.forEach((s) => s.remove());
    };
  }, [title, description, canonicalPath, jsonLd]);

  return null;
};
