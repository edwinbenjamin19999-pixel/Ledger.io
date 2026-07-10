import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AutomationFlow } from "@/components/guides/AutomationFlow";
import { ComparisonTable } from "@/components/guides/ComparisonTable";
import { FAQAccordion } from "@/components/guides/FAQAccordion";
import { Button } from "@/components/ui/button";
import { Sparkles, Receipt, Brain, BookOpen, Banknote, Calculator, FileBarChart, ArrowRight, Zap, Shield, Clock, BarChart3, FileSearch, Users } from "lucide-react";

const FLOW = [
  { icon: Receipt, label: "Kvitto", sub: "Foto eller PDF" },
  { icon: Brain, label: "AI-tolkning", sub: "OCR + språkmodell" },
  { icon: BookOpen, label: "Bokföring", sub: "Auto-kontering" },
  { icon: Banknote, label: "Bankmatchning", sub: "PSD2-koppling" },
  { icon: Calculator, label: "Moms", sub: "Korrekt kod" },
  { icon: FileBarChart, label: "Rapport", sub: "Realtid" },
];

const AUTO = [
  { icon: Receipt, title: "Kvitton & kvittohantering", desc: "Fota — AI tolkar leverantör, belopp, moms och datum." },
  { icon: BookOpen, title: "Kontering", desc: "Föreslår BAS-konto och motkonto med konfidens." },
  { icon: Banknote, title: "Bankavstämning", desc: "Matchar transaktioner mot verifikationer automatiskt." },
  { icon: Calculator, title: "Momsdeklaration", desc: "Sammanställer SKV 4700 och lämnar in vid godkännande." },
  { icon: FileSearch, title: "Anomalidetektering", desc: "Flaggar dubbletter, ovanliga belopp och misstänkta händelser." },
  { icon: BarChart3, title: "Rapporter", desc: "Resultat, balans och kassaflöde uppdateras i realtid." },
];

const COMPARE = [
  { label: "Bokför kvitton automatiskt", traditional: false, ai: true },
  { label: "Lär sig av korrigeringar", traditional: false, ai: true },
  { label: "Bankavstämning i realtid", traditional: "Manuell", ai: "Automatisk" },
  { label: "Momsdeklaration", traditional: "Du gör", ai: "AI förbereder" },
  { label: "Tid per månad (50 verifikationer)", traditional: "8–12 h", ai: "30 min" },
  { label: "Skalar med fler klienter", traditional: false, ai: true },
];

const FAQS = [
  { q: "Är AI-bokföring säkert?", a: "Ja. Cogniq följer svensk redovisningsstandard, BAS-kontoplan och K2/K3. All data är krypterad och GDPR-säkrad." },
  { q: "Vad händer om AI:n gör fel?", a: "Vid osäkerhet stannar AI:n och frågar dig. Allt är spårbart och korrigerbart i revisionsloggen." },
  { q: "Behöver jag fortfarande revisor?", a: "Ja, om du har revisionsplikt. AI:n underlättar arbetet men ersätter inte den oberoende granskningen." },
  { q: "Hur snabbt kommer jag igång?", a: "30 minuter. Vi importerar din historik från Fortnox, Visma eller Bokio automatiskt." },
];

export default function AIBookkeepingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header lightBg />
      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-blue-50/40 to-white">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#0052FF]">
              <Sparkles className="w-3 h-3" />
              AI-bokföring förklarat
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A]">
              Bokföring som sköter sig själv
            </h1>
            <p className="mt-5 text-lg text-[#475569] leading-relaxed">
              Förstå hur AI förändrar bokföring — från kvitto till färdig rapport, utan manuella steg.
            </p>
          </div>
        </section>

        {/* What */}
        <section className="py-12">
          <div className="container mx-auto max-w-3xl px-6">
            <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">Vad är AI-bokföring?</h2>
            <p className="mt-4 text-[#334155] leading-[1.8] text-[17px]">
              AI-bokföring är ett system där artificiell intelligens automatiskt tolkar dokument, föreslår konton, hanterar moms och bokför verifikationer. Till skillnad från regelbaserad automation lär sig AI:n av varje korrigering och blir bättre över tid.
            </p>
          </div>
        </section>

        {/* Flow */}
        <section className="py-12 bg-slate-50/60 border-y border-slate-100">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">Hur det fungerar</h2>
              <p className="mt-2 text-[#64748b]">Ett kvitto in — bokfört, momshanterat och rapporterat ut.</p>
            </div>
            <AutomationFlow steps={FLOW} />
          </div>
        </section>

        {/* What automated */}
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">Vad som automatiseras</h2>
              <p className="mt-2 text-[#64748b]">Sex moment som tidigare krävde manuellt arbete.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {AUTO.map((a) => (
                <div key={a.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                    <a.icon className="w-5 h-5 text-[#0052FF]" />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#0F172A]">{a.title}</h3>
                  <p className="mt-2 text-sm text-[#64748b] leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-16 bg-slate-50/60 border-y border-slate-100">
          <div className="container mx-auto max-w-4xl px-6">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">AI vs traditionellt system</h2>
              <p className="mt-2 text-[#64748b]">Vad skillnaden faktiskt blir i vardagen.</p>
            </div>
            <ComparisonTable rows={COMPARE} />
          </div>
        </section>

        {/* Trust quick */}
        <section className="py-12">
          <div className="container mx-auto max-w-4xl px-6 grid sm:grid-cols-3 gap-4 text-center">
            {[{i: Shield, t: "GDPR-säker", d: "Krypterad data, EU-hosting"}, {i: Zap, t: "30 min onboarding", d: "Vi importerar din historik"}, {i: Clock, t: "10+ h/mån sparat", d: "Genomsnitt SME-kund"}].map((x) => (
              <div key={x.t} className="rounded-2xl border border-slate-100 p-6">
                <x.i className="w-5 h-5 mx-auto text-[#0052FF]" />
                <div className="mt-3 font-semibold text-[#0F172A]">{x.t}</div>
                <div className="text-sm text-[#64748b]">{x.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-6">
            <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-6">Vanliga frågor</h2>
            <FAQAccordion items={FAQS} />
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-6">
            <div className="rounded-3xl bg-[#0052FF] p-10 md:p-14 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Redo att släppa det manuella?</h2>
              <p className="mt-3 text-white/70">Onboarding på 30 minuter. Ingen bindning.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-white text-[#0F172A] hover:bg-white/90 font-semibold">
                  <Link to="/auth">Testa Cogniq <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/contact">Boka demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
