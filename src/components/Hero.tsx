import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { getSafeStorage, isIframeEnvironment, safariDebugError, safariDebugLog } from "@/lib/safe-browser";

export const Hero = () => { const navigate = useNavigate();
  const iframePreview = isIframeEnvironment();
  const [orgNumber, setOrgNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);

  const handleOrgNumberChange = async (value: string) => { setOrgNumber(value);
    setCompanyName(null);
    
    const cleaned = value.replace(/[\s-]/g, '');
    if (cleaned.length === 10) { if (iframePreview) { safariDebugLog("4. API/config loading", { action: "company-lookup:skipped-iframe-preview",
          orgNumber: cleaned,
        });
        return;
      }

      setIsLoading(true);
      try { safariDebugLog("4. API/config loading", { action: "company-lookup:start",
          orgNumber: cleaned,
        });

        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.functions.invoke('company-lookup', { body: { org_number: cleaned }
        });

        if (error) throw error;

        safariDebugLog("4. API/config loading", { action: "company-lookup:complete",
          foundCompany: Boolean(data?.name),
        });
        
        if (data?.name) { setCompanyName(data.name);
        }
      } catch (e) { safariDebugError('company lookup failed', e);
        console.log('Lookup failed, will use manual entry');
      } finally { setIsLoading(false);
      }
    }
  };

  const handleStart = () => { if (!orgNumber.trim()) { navigate('/auth');
      return;
    }

    const storage = getSafeStorage('sessionStorage');
    storage.setItem('pending_org_number', orgNumber);
    if (companyName) { storage.setItem('pending_company_name', companyName);
    }
    navigate('/auth');
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(215,85%,12%)] via-[hsl(215,75%,18%)] to-[hsl(185,70%,22%)]" />
      
      {/* Animated glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[hsl(185,70%,50%)] rounded-full opacity-[0.07] blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[hsl(215,85%,40%)] rounded-full opacity-[0.08] blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="container mx-auto text-center relative z-10 max-w-4xl py-16">
        {/* AI-native positioning badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
          <Sparkles className="h-4 w-4 text-secondary" />
          <span className="text-sm font-medium text-white">AI-native bokföringsplattform</span>
        </div>

        {/* Main headline - positioning as AI-native, not traditional+AI */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight">
          Bokföring byggd
          <br />
          <span className="bg-gradient-to-r from-secondary via-white to-accent bg-clip-text text-transparent">
            kring AI från grunden
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-2xl mx-auto">
          Inte ett gammalt system med AI ovanpå. En helt ny plattform där AI tolkar kvitton, klassificerar transaktioner och bokför — automatiskt.
        </p>

        {/* Quick start form */}
        <div className="max-w-md mx-auto space-y-4 mb-12">
          <div className="relative">
            <Input
              type="text"
              placeholder="Ange organisationsnummer"
              value={orgNumber}
              onChange={(e) => handleOrgNumberChange(e.target.value)}
              className="h-14 text-lg bg-white/10 border-white/30 text-white placeholder:text-white/50 text-center rounded-xl backdrop-blur-sm focus:bg-white/15 transition-colors"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {companyName && (
            <div className="flex items-center justify-center gap-2 text-secondary animate-fade-in">
              <Check className="w-4 h-4" />
              <span className="font-medium">{companyName}</span>
            </div>
          )}
          
          <Button 
            size="lg" 
            onClick={handleStart}
            className="w-full h-14 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl hover:shadow-secondary/20 transition-all duration-300 rounded-xl group"
          >
            {orgNumber ? 'Logga in' : 'Logga in'}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-white/60 text-sm">
            Lansering snart • Kontakta oss för tidig åtkomst
          </p>
        </div>

        {/* Trust indicators updated */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-white/70 text-sm">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-secondary" />
            BAS 2026
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-secondary" />
            Skatteverket-integration
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-secondary" />
            GDPR & bankID
          </span>
        </div>

        {/* Key differentiators instead of vanity metrics */}
        <div className="mt-12 pt-8 border-t border-white/10">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-secondary">Ny i</div>
              <div className="text-sm text-white/60 mt-1">Företag</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">AI</div>
              <div className="text-sm text-white/60 mt-1">driven</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">99.9%</div>
              <div className="text-sm text-white/60 mt-1">Upptid</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
