import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Building2, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FirmAuth = () => { const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [firmOrgNumber, setFirmOrgNumber] = useState("");

  const handleLogin = async (e: React.FormEvent) => { e.preventDefault();
    setIsSubmitting(true);
    try { const { error } = await supabase.auth.signInWithPassword({ email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      // Check if user belongs to a firm
      const { data: membership } = await supabase
        .from("firm_members")
        .select("firm_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!membership) { toast.error("Ditt konto är inte kopplat till någon byrå. Registrera en ny byrå istället.");
        await supabase.auth.signOut();
        setActiveTab("register");
        return;
      }

      toast.success("Inloggad!");
      navigate("/firm/dashboard");
    } catch (error: any) { toast.error(error.message || "Inloggning misslyckades");
    } finally { setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => { e.preventDefault();
    if (!firmName || !firmOrgNumber) { toast.error("Fyll i byråns namn och organisationsnummer");
      return;
    }
    setIsSubmitting(true);
    try { // 1. Register user
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: regEmail,
        password: regPassword,
        options: { data: { first_name: regFirstName, last_name: regLastName },
          emailRedirectTo: window.location.origin + "/firm/dashboard",
        },
      });
      if (authError) throw authError;

      if (!authData.user) { toast.success("Bekräfta din e-post för att slutföra registreringen");
        return;
      }

      // 2. Create the firm
      const { data: firm, error: firmError } = await supabase
        .from("accounting_firms")
        .insert({ name: firmName,
          org_number: firmOrgNumber,
          email: regEmail,
          created_by: authData.user.id,
        })
        .select()
        .maybeSingle();

      if (firmError) throw firmError;

      // 3. Add user as admin member
      const { error: memberError } = await supabase
        .from("firm_members")
        .insert({ firm_id: firm.id,
          user_id: authData.user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      toast.success("Byrå registrerad! Bekräfta din e-post för att logga in.");
      setActiveTab("login");
    } catch (error: any) { toast.error(error.message || "Registrering misslyckades");
    } finally { setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-page-bg p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.05)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(210_70%_50%/0.04)_0%,transparent_60%)] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 auth-stagger-1">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="auth-ai-dot" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight auth-logo-text">Cogniq Byrå</h1>
          <p className="text-muted-foreground mt-1">
            Portal för redovisningskonsultbyråer
          </p>
          <p className="text-[11px] text-muted-foreground/50 mt-2 tracking-wide uppercase">
            AI-drivet system redo
          </p>
        </div>

        <Card className="auth-card auth-stagger-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Logga in</CardTitle>
            <CardDescription>Logga in på ditt byrå-konto</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-post</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Lösenord</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full auth-btn-primary" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Loggar in..." : "Logga in"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Registrering av nya byråer är inte tillgänglig ännu.{" "}
              <a href="mailto:kontakt@cogniq.se" className="text-primary hover:underline">Kontakta oss</a> för tidig åtkomst.
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 text-center space-y-2 auth-stagger-4">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Hantera alla kunder</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Säker fullmakt</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Är du företagskund?{" "}
            <a href="/auth" className="text-primary underline">Logga in här istället</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirmAuth;
