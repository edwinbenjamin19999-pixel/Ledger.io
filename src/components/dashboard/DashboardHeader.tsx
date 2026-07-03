import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Building2, LogOut, Settings, Bot, ChevronDown, Shield, Menu, Sparkles } from "lucide-react";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

export const DashboardHeader = () => { const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = () => { const email = user?.email || "";
    return email.substring(0, 2).toUpperCase();
  };

  const handleNavigate = (path: string) => { setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 
            onClick={() => navigate("/dashboard")}
            className="text-2xl font-bold bg-clip-text text-transparent bg-[image:var(--gradient-accent)] cursor-pointer"
          >
            NorthLedger
          </h1>
          
          <nav className="hidden md:flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  Ekonomi <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => navigate("/accounting")}>
                  Bokföring
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/invoices")}>
                  Fakturor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/chart-of-accounts")}>
                  Kontoplan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account-analysis")}>
                  Kontoanalys
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/verifications")}>
                  Verifikationer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/registry")}>
                  Kund- & Leverantörsregister
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/budget")}>
                  Budget
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/depreciation")}>
                  Tillgångar & utrustning
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  Analyser <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => navigate("/reports")}>
                  Rapporter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/vat-reports")}>
                  Momsrapportering
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/cashflow")}>
                  Kassaflöde
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/consolidation")}>
                  Koncernkonsolidering
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/auditor")}>
                  Revisor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  Verktyg <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => navigate("/bank")}>
                  Bank
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/hr")}>
                  HR & Lön
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/migration")}>
                  Migrera data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/gdpr")}>
                  <Shield className="mr-2 h-4 w-4" />
                  GDPR & Integritet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" onClick={() => navigate("/assistant")}>
              <Bot className="w-4 h-4 mr-2" />
              AI-Assistent
            </Button>

            <Button 
              onClick={() => navigate("/bookkeep")}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Bokför
            </Button>

            <Button variant="ghost" onClick={() => navigate("/companies")}>
              <Building2 className="w-4 h-4 mr-2" />
              Företag
            </Button>
          </nav>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Öppna meny</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] overflow-y-auto">
                <nav className="flex flex-col gap-4 mt-8">
                  <Button 
                    variant="ghost" 
                    className="justify-start"
                    onClick={() => handleNavigate("/dashboard")}
                  >
                    Dashboard
                  </Button>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground px-3">Ekonomi</p>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/accounting")}
                    >
                      Bokföring
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/invoices")}
                    >
                      Fakturor
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/chart-of-accounts")}
                    >
                      Kontoplan
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/account-analysis")}
                    >
                      Kontoanalys
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/verifications")}
                    >
                      Verifikationer
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/registry")}
                    >
                      Kund- & Leverantörsregister
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/budget")}
                    >
                      Budget
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/depreciation")}
                    >
                      Tillgångar & utrustning
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground px-3">Analyser</p>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/reports")}
                    >
                      Rapporter
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/vat-reports")}
                    >
                      Momsrapportering
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/cashflow")}
                    >
                      Kassaflöde
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/consolidation")}
                    >
                      Koncernkonsolidering
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/auditor")}
                    >
                      Revisor
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground px-3">Verktyg</p>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/bank")}
                    >
                      Bank
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/hr")}
                    >
                      HR & Lön
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/migration")}
                    >
                      Migrera data
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/gdpr")}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      GDPR & Integritet
                    </Button>
                  </div>

                  <Button 
                    variant="ghost" 
                    className="justify-start"
                    onClick={() => handleNavigate("/assistant")}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    AI-Assistent
                  </Button>

                  <Button 
                    className="justify-start bg-gradient-to-r from-primary to-primary/80"
                    onClick={() => handleNavigate("/bookkeep")}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Bokför
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="justify-start"
                    onClick={() => handleNavigate("/companies")}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Företag
                  </Button>

                  <div className="border-t pt-4 mt-4 space-y-2">
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => handleNavigate("/settings")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Inställningar
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start w-full"
                      onClick={() => { setMobileMenuOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logga ut
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Mitt konto</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Inställningar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logga ut
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
