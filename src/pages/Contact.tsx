import { useState } from "react";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-form", { body: formData });
      if (error) throw error;
      toast.success("Tack för ditt meddelande! Vi återkommer inom 24 timmar.");
      setFormData({ name: "", email: "", company: "", message: "" });
    } catch (error) {
      console.error("Error submitting form:", error);
      const subject = encodeURIComponent(`Kontaktförfrågan från ${formData.name}`);
      const body = encodeURIComponent(
        `Namn: ${formData.name}\nFöretag: ${formData.company}\nEmail: ${formData.email}\n\nMeddelande:\n${formData.message}`,
      );
      window.location.href = `mailto:support@ledger.io?subject=${subject}&body=${body}`;
      toast.success("E-postklient öppnad. Skicka meddelandet därifrån.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PageSEO
        title="Kontakta oss — Ledger.io"
        description="Har du frågor om Ledger.io eller vill boka en demo? Kontakta oss så återkommer vi vanligtvis inom 24 timmar på vardagar."
        path="/contact"
      />
      {/* Header */}
      <header
        className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur"
        style={{ backgroundColor: "rgba(5, 13, 26, 0.9)" }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-[#3b82f6]">
            Ledger.io
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 relative">
        <div className="max-w-5xl mx-auto">
          {/* Heading */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">Kontakta oss</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Har du frågor om Ledger.io? Vill du boka en demo? Vi hjälper dig gärna!
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              {[
                {
                  icon: Mail,
                  title: "E-post",
                  content: (
                    <a
                      href="mailto:support@ledger.io"
                      className="text-slate-600 hover:text-[#3b82f6] transition-colors"
                    >
                      support@ledger.io
                    </a>
                  ),
                },
                {
                  icon: Phone,
                  title: "Telefon",
                  content: (
                    <div className="text-slate-600">
                      <a href="tel:+46761646986" className="hover:text-slate-900 transition-colors">
                        +46 76 164 69 86
                      </a>
                      <p className="text-sm text-slate-500">Vardagar 09:00–17:00</p>
                    </div>
                  ),
                },
                {
                  icon: MapPin,
                  title: "Plats",
                  content: <p className="text-slate-600">Stockholm, Sverige</p>,
                },
              ].map(({ icon: Icon, title, content }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start gap-4 shadow-sm"
                >
                  <div className="p-2.5 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                    <Icon className="w-5 h-5 text-[#3b82f6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-slate-900">{title}</h3>
                    {content}
                  </div>
                </div>
              ))}

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50">
                <h3 className="font-semibold mb-2 text-slate-900">Svarstid</h3>
                <p className="text-sm text-slate-600">
                  Vi svarar vanligtvis inom 24 timmar på vardagar. För brådskande ärenden, ring oss direkt.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Skicka ett meddelande</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Fyll i formuläret så återkommer vi så snart som möjligt.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700">Namn *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ditt namn"
                      className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#3b82f6]/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">E-post *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="din@email.se"
                      className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#3b82f6]/40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-slate-700">Företag</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Ditt företagsnamn"
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#3b82f6]/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-slate-700">Meddelande *</Label>
                  <Textarea
                    id="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Beskriv ditt ärende..."
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#3b82f6]/40"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full md:w-auto bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)]"
                >
                  {isSubmitting ? (
                    "Skickar..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Skicka meddelande
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
