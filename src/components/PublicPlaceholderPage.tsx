import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PublicPlaceholderPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export default function PublicPlaceholderPage({ title, description, icon: Icon }: PublicPlaceholderPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-32">
        <div className="max-w-lg w-full text-center space-y-6">
          {Icon && (
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center">
              <Icon className="w-7 h-7 text-[#3b82f6]" />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0F172A]">{title}</h1>
          <p className="text-[#475569] leading-relaxed">{description}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-[#FAEEDA] text-[#7A5417] border border-[#F0DDB7]">
            <Calendar className="w-3 h-3" />
            Kommer snart
          </span>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild className="bg-white text-[#0F172A] hover:bg-white/90 font-semibold gap-1.5">
              <Link to="/auth">Testa Cogniq <ArrowRight className="w-3.5 h-3.5" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Boka demo</Link>
            </Button>
            <Button asChild variant="ghost" className="text-[#64748b]">
              <Link to="/"><ArrowLeft className="w-3.5 h-3.5 mr-1" />Tillbaka</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
