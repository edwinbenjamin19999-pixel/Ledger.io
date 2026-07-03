import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, BookCheck, Lock, FileCheck } from "lucide-react";

const SECTIONS = [
  { icon: BookCheck, title: "BAS-kontoplan 2026", desc: "Bokfy följer den senaste BAS-kontoplanen med automatisk uppdatering vid årsskifte. Alla konton, momskoder och SRU-kopplingar är förkonfigurerade." },
  { icon: Shield, title: "GDPR & dataskydd", desc: "All data lagras inom EU. Krypterad i vila och i transit. Inbyggt stöd för registerutdrag, dataportabilitet och rätt att bli glömd." },
  { icon: FileCheck, title: "Bokföringslagen (BFL)", desc: "Digital arkivering enligt BFL i 7 år. Spårbarhet, oföränderlighet och fullständig revisionslogg på varje verifikation." },
  { icon: Lock, title: "Årsredovisningslagen (ÅRL)", desc: "Stöd för K2 och K3. Genererar årsredovisning i strukturerat format för digital inlämning till Bolagsverket." },
];

export default function CompliancePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header lightBg />
      <main className="flex-1">
        <section className="pt-32 pb-12 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#3b82f6]">
              <Shield className="w-3 h-3" />
              Regelefterlevnad
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-[#0F1B2D]">
              Byggt för svenska regler
            </h1>
            <p className="mt-5 text-lg text-[#475569] leading-relaxed">
              Bokfy följer svensk redovisningsstandard, dataskyddsregler och inlämningskrav — så att du kan fokusera på företaget istället för paragraferna.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto max-w-4xl px-6 grid sm:grid-cols-2 gap-5">
            {SECTIONS.map((s) => (
              <div key={s.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <h3 className="mt-4 font-semibold text-[#0F1B2D]">{s.title}</h3>
                <p className="mt-2 text-sm text-[#64748b] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold text-[#0F1B2D]">Trygghet inbyggd från dag ett</h2>
            <p className="mt-3 text-[#64748b]">Inga plug-ins, inga bilagor. Allt är en del av plattformen.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-white text-[#0F1B2D] hover:bg-white/90 font-semibold">
                <Link to="/auth">Testa Bokfy <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/security-info">Läs om säkerhet</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
