import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building, Users, Brain, Calculator, Layers, TrendingUp, Shield, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";

const PROBLEMS = [
  { title: "Manuellt arbete dominerar", desc: "Konsultens tid går åt till repetitiv kontering istället för rådgivning." },
  { title: "Svårt att skala", desc: "Varje ny klient kräver ny kapacitet — marginalen växer inte med volym." },
  { title: "Beroende av andras system", desc: "Du är låst till din leverantörs roadmap, prismodell och varumärke." },
  { title: "Pris- och konkurrenstryck", desc: "Stora kedjor pressar priser och tar dina klienter med automation." },
];

const FEATURES = [
  { icon: Layers, title: "White-label branding", desc: "Din logga, färger och domän — klienten ser bara dig." },
  { icon: Users, title: "Multi-klientportal", desc: "Hantera 50+ klienter från en enda dashboard." },
  { icon: Brain, title: "AI-bokföring", desc: "Konfidensbaserad autonom bokföring per klient." },
  { icon: Calculator, title: "Automatiserad moms", desc: "SKV 4700 förberedd och inlämnad utan handpåläggning." },
  { icon: Building, title: "Partnerportal", desc: "Onboarding, support och fakturering på ett ställe." },
  { icon: TrendingUp, title: "Revenue share", desc: "Bygg en återkommande intäktsström med 70 %+ marginal." },
];

const STEPS = [
  { n: 1, t: "Anslut", d: "Bjud in klienter eller migrera från Fortnox/Visma." },
  { n: 2, t: "Aktivera AI", d: "Konfigurera bokföringsregler per klient." },
  { n: 3, t: "Granska", d: "AI:n bokför — du granskar avvikelser." },
  { n: 4, t: "Skala", d: "Mer klienter, samma team, högre marginal." },
];

const BENEFITS = [
  { stat: "3x", label: "fler klienter per medarbetare" },
  { stat: "70%", label: "marginal på White Label-affären" },
  { stat: "10h", label: "sparade per klient och månad" },
  { stat: "30 min", label: "onboarding av ny klient" },
];

export default function AccountingFirmsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        {/* Hero — dark */}
        <section className="relative overflow-hidden bg-[#0052FF] pt-32 pb-20 text-white">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, rgba(0,82,255,0.4), transparent 60%)" }} />
          <div className="relative container mx-auto max-w-4xl px-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium text-white">
              <Sparkles className="w-3 h-3" />
              För redovisningsbyråer
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] text-white">
              Lansera din egen <span className="text-[#BBD1FF]">bokföringsplattform</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              Erbjud Cogniq under ditt varumärke — med automation, AI och full kontroll över dina klienter.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-white text-[#0052FF] hover:bg-blue-50 font-semibold h-11 px-6">
                <Link to="/white-label">Starta White Label <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white h-11 px-6">
                <Link to="/firm/auth">Logga in som partner</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] tracking-tight">Verkligheten för svenska byråer 2026</h2>
              <p className="mt-3 text-[#64748b]">Fyra utmaningar som avgör vem som växer — och vem som faller bort.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {PROBLEMS.map((p) => (
                <div key={p.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-[#7A5417]" />
                  <h3 className="mt-3 font-semibold text-[#0F172A]">{p.title}</h3>
                  <p className="mt-2 text-sm text-[#64748b] leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="py-16 bg-slate-50/60 border-y border-slate-100">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] tracking-tight">En plattform — under ditt namn</h2>
            <p className="mt-4 text-[#475569] leading-relaxed text-lg">
              Cogniq White Label ger dig hela kraften av en modern AI-driven bokföringsplattform — men presenterad som din egen produkt. Du behåller relationen, varumärket och marginalen.
            </p>
            <Button asChild className="mt-6 bg-[#0052FF] text-white hover:bg-[#0052FF]">
              <Link to="/white-label">Se hela White Label-pitchen <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] tracking-tight">Det här ingår</h2>
              <p className="mt-3 text-[#64748b]">Sex byggstenar som gör skillnaden mellan att jaga och att skala.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-[#0052FF]" />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#0F172A]">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#64748b] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How */}
        <section className="py-16 bg-slate-50/60 border-y border-slate-100">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] tracking-tight">Så funkar det</h2>
              <p className="mt-3 text-[#64748b]">Från kontrakt till första klienten på under en vecka.</p>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl bg-white border border-slate-100 p-6">
                  <div className="w-9 h-9 rounded-full bg-[#0052FF] text-white font-bold flex items-center justify-center">{s.n}</div>
                  <h3 className="mt-4 font-semibold text-[#0F172A]">{s.t}</h3>
                  <p className="mt-2 text-sm text-[#64748b] leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits stats */}
        <section className="py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] tracking-tight">Vad det betyder för din byrå</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {BENEFITS.map((b) => (
                <div key={b.label} className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                  <div className="text-4xl md:text-5xl font-bold text-[#0052FF]">{b.stat}</div>
                  <div className="mt-2 text-sm text-[#64748b]">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="py-12 bg-slate-50/60 border-y border-slate-100">
          <div className="container mx-auto max-w-4xl px-6 flex flex-wrap justify-center gap-6 text-sm text-[#64748b]">
            {["BAS-kontoplan", "K2/K3-stöd", "GDPR-säker", "BankID-signering", "Skatteverket-integration"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#0052FF]" />{t}
              </span>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="container mx-auto max-w-3xl px-6">
            <div className="relative overflow-hidden rounded-3xl bg-[#0052FF] p-10 md:p-14 text-center text-white">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(0,82,255,0.4), transparent 60%)" }} />
              <div className="relative">
                <Shield className="w-7 h-7 mx-auto text-[#0052FF]" />
                <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Redo att skala din byrå?</h2>
                <p className="mt-3 text-white/70 max-w-md mx-auto">Boka en partnergenomgång — vi visar plattformen och räknar hem caset tillsammans.</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild className="bg-white text-[#0052FF] hover:bg-blue-50 font-semibold">
                    <Link to="/white-label">Starta White Label <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                    <Link to="/firm/auth">Logga in som partner</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
