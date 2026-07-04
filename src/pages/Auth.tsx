import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ZodError } from "zod";
import { passwordRequirementsText, signUpSchema, signInSchema, strongPasswordSchema } from "@/lib/schemas/auth";
import { isIframeEnvironment, safariDebugError, safariDebugLog } from "@/lib/safe-browser";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput, type AuthInputProps } from "@/components/auth/AuthInput";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { TrustBar } from "@/components/onboarding/TrustBar";

const GoogleIcon = () => (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

type Mode = "signin" | "signup" | "reset" | "update";

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Ett fel uppstod";

const showFormError = (error: unknown) => {
  if (error instanceof ZodError) error.errors.forEach((err) => toast.error(err.message));
  else toast.error(getErrorMessage(error));
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const iframePreview = isIframeEnvironment();

  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const getNextPath = (): string | null => {
    const raw = searchParams.get("next") || searchParams.get("redirect");
    if (!raw) return null;
    if (!raw.startsWith("/")) return null;
    if (raw.startsWith("/auth")) return null;
    return raw;
  };
  const redirectAfterAuth = async (fallback: string) => {
    const next = getNextPath();
    if (next) { navigate(next, { replace: true }); return; }
    try {
      const { resolveDefaultLanding } = await import("@/lib/auth/resolveDefaultLanding");
      const dest = await resolveDefaultLanding();
      navigate(dest, { replace: true });
    } catch {
      navigate(fallback, { replace: true });
    }
  };
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Render auth UI immediately. Session check runs in the background;
  // if a session exists, we redirect — otherwise the form is already there.
  const [loading, setLoading] = useState(false);

  // Lås ljust tema på auth-sidan så vita inputfält + mörk text alltid är synliga,
  // oavsett om användaren har dark mode på i resten av appen.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (prev) root.setAttribute("data-theme", prev);
      else root.removeAttribute("data-theme");
    };
  }, []);

  // Helper: decide where to send a freshly-authenticated user.
  // New users (created < 60s ago) → onboarding. Test accounts skip onboarding.
  const routeAfterAuth = async (userCreatedAt?: string, userMetadata?: Record<string, unknown>) => {
    const next = getNextPath();
    if (next) { navigate(next, { replace: true }); return; }
    const createdMs = userCreatedAt ? new Date(userCreatedAt).getTime() : 0;
    const isNew = createdMs > 0 && Date.now() - createdMs < 60_000;
    const isTestAccount = userMetadata?.test_account === true || userMetadata?.is_test_account === true;
    if (isTestAccount) {
      await redirectAfterAuth("/dashboard");
      return;
    }
    if (isNew) { navigate("/quick-onboarding", { replace: true }); return; }
    const { resolveDefaultLanding } = await import("@/lib/auth/resolveDefaultLanding");
    const dest = await resolveDefaultLanding();
    navigate(dest, { replace: true });
  };

  useEffect(() => {
    let isActive = true;
    let unsub: (() => void) | undefined;
    const init = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        // CRITICAL: subscribe BEFORE getSession so we don't miss the
        // OAuth redirect-back event that Supabase fires when it restores the
        // session from the tokens in the callback URL.
        // We always subscribe so the Google flow works seamlessly regardless
        // of environment.
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (!isActive) return;
          if (event === "PASSWORD_RECOVERY") { setMode("update"); return; }
          if (event === "SIGNED_IN" && session?.user) {
            routeAfterAuth(session.user.created_at, session.user.user_metadata as Record<string, unknown>);
          }
        });
        unsub = () => sub.subscription.unsubscribe();

        const { data: { session } } = await supabase.auth.getSession();
        if (!isActive) return;
        if (session && searchParams.get("type") === "recovery") {
          setMode("update");
          return;
        }
        if (session?.user) routeAfterAuth(session.user.created_at, session.user.user_metadata as Record<string, unknown>);
      } catch (error) {
        safariDebugError("auth page session init failed", error);
      }
    };
    init();
    return () => { isActive = false; unsub?.(); };
  }, [navigate, searchParams]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const validated = signInSchema.parse({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Felaktig e-postadress eller lösenord");
        } else {
          toast.error(error.message);
        }
        return;
      }
      // Persist tenant slug if signing in from a tenant host
      try {
        const { resolveTenantSlugFromHost, fetchTenantByDomain } = await import("@/lib/tenant/resolveTenant");
        const { setActiveTenantSlug } = await import("@/hooks/useUserTenants");
        const host = window.location.hostname.toLowerCase();
        const isStandard = host === "cogniq.se" || host === "localhost" ||
          host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") ||
          host === "app.cogniq.se" || host === "www.cogniq.se";
        let tenantSlug: string | null = resolveTenantSlugFromHost(host);
        if (!tenantSlug && !isStandard) {
          const t = await fetchTenantByDomain(host);
          tenantSlug = t?.slug ?? null;
        }
        if (tenantSlug) setActiveTenantSlug(tenantSlug);
        else setActiveTenantSlug(null);
      } catch { /* non-blocking */ }
      toast.success("Välkommen tillbaka!");
      redirectAfterAuth("/ai-ekonom");
    } catch (error: unknown) {
      showFormError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const validated = signUpSchema.parse({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      });
      const nextPath = getNextPath();
      const redirectUrl = nextPath
        ? `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`
        : `${window.location.origin}/quick-onboarding`;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { terms_accepted_at: new Date().toISOString() },
        },
      });
      if (error) {
        if (error.message.includes("already registered")) toast.error("E-postadressen är redan registrerad");
        else toast.error(error.message);
        return;
      }
      if (signUpData.session) {
        toast.success("Välkommen till Cogniq!");
        redirectAfterAuth("/quick-onboarding");
      } else {
        toast.success(
          nextPath
            ? "Bekräfta din e-post för att fortsätta till din inbjudan."
            : "Konto skapat! Kontrollera din e-post för att bekräfta."
        );
      }
    } catch (error: unknown) {
      showFormError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      if (!email) { toast.error("Ange din e-postadress"); return; }
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Återställningslänk skickad! Kontrollera din e-post.");
      setMode("signin");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const newPassword = formData.get("newPassword") as string;
      const confirmPassword = formData.get("confirmPassword") as string;
      if (newPassword !== confirmPassword) { toast.error("Lösenorden matchar inte"); return; }
      strongPasswordSchema.parse(newPassword);
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error(error.message); return; }
      toast.success("Lösenordet har uppdaterats! Logga in med ditt nya lösenord.");
      await supabase.auth.signOut();
      setMode("signin");
      navigate("/auth");
    } catch (error: unknown) {
      showFormError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  // FLAT: solid blå CTA — färgskifte + skala, aldrig skugga (matchar landningssidan)
  const primaryBtn =
    "w-full h-[52px] rounded-xl bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] text-white font-bold text-[15px] shadow-accent " +
    "hover:-translate-y-0.5 hover:shadow-accent-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2 " +
    "disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2";

  const googleBtn =
    "w-full h-[52px] rounded-xl border border-border bg-white hover:border-[#0052FF]/30 hover:shadow-md " +
    "transition-colors duration-200 font-semibold text-[15px] text-[#0F172A] " +
    "disabled:opacity-60 flex items-center justify-center gap-3";

  const handleGoogle = async () => {
    setIsSubmitting(true);
    try {
      // ALWAYS use the current origin as the redirect target so previewing
      // doesn't break the flow. Supabase handles the OAuth round-trip; the
      // new session arrives via onAuthStateChange after the callback.
      const origin = window.location.origin;
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: origin },
      });
      if (error) {
        toast.error(error.message || "Kunde inte logga in med Google");
        return;
      }
      // Browser is now navigating to Google. The new session will arrive via
      // onAuthStateChange after the callback completes.
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const Divider = () => (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[11px] uppercase tracking-wider text-slate-400">eller med e-post</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );

  const PasswordInput = ({ visible, onToggle, className, ...props }: AuthInputProps & { visible: boolean; onToggle: () => void }) => {
    const Icon = visible ? EyeOff : Eye;
    return (
      <div className="relative">
        <AuthInput {...props} type={visible ? "text" : "password"} className={`pr-12 ${className ?? ""}`} />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex h-full w-12 items-center justify-center text-slate-400 transition-colors hover:text-[#3b82f6]"
          aria-label={visible ? "Dölj lösenord" : "Visa lösenord"}
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <AuthShell>
      {/* Desktop logo (mobile already shown in shell) */}
      <div className="hidden lg:flex items-center gap-0 mb-10">
        <span className="text-xl font-extrabold tracking-tight text-[#0F172A]">Cog</span>
        <span className="text-xl font-extrabold tracking-tight text-[#0052FF]">niq</span>
      </div>

      {/* SIGN IN */}
      {mode === "signin" && (
        <>
          <div className="mb-8">
            <h2 className="text-[24px] font-bold tracking-tight text-[#0F172A]">Välkommen tillbaka</h2>
            <p className="text-sm text-slate-500 mt-1">Logga in på ditt konto</p>
          </div>

          <button type="button" onClick={handleGoogle} disabled={isSubmitting} className={googleBtn}>
            <GoogleIcon />
            Fortsätt med Google
          </button>

          <Divider />

          <form onSubmit={handleSignIn} className="space-y-5">
            <AuthInput name="email" type="email" placeholder="E-postadress" required autoComplete="email" />
            <PasswordInput
              name="password"
              visible={showSignInPassword}
              onToggle={() => setShowSignInPassword((value) => !value)}
              placeholder="Lösenord"
              required
              autoComplete="current-password"
            />

            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Loggar in…" : "Logga in"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode("reset")}
                className="text-[13px] text-slate-500 hover:text-[#3b82f6] transition-colors"
              >
                Glömt lösenord?
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-[12px] text-slate-400">
            Säker inloggning · Krypterad data · Drift i Sverige
          </p>

          <div className="mt-8 text-center">
            <button
              onClick={() => setMode("signup")}
              className="text-[13px] text-slate-600 hover:text-[#3b82f6] transition-colors font-medium"
            >
              Skapa konto →
            </button>
          </div>
        </>
      )}

      {/* SIGN UP */}
      {mode === "signup" && (
        <>
          <OnboardingProgress current={1} />

          <div className="mb-8">
            <h2 className="text-[24px] font-bold tracking-tight text-[#0F172A]">Skapa konto</h2>
            <p className="text-sm text-slate-500 mt-1">Aktivera ditt finansiella operativsystem</p>
          </div>

          <button type="button" onClick={handleGoogle} disabled={isSubmitting} className={googleBtn}>
            <GoogleIcon />
            Fortsätt med Google
          </button>

          <Divider />

          <form onSubmit={handleSignUp} className="space-y-5">
            <AuthInput name="email" type="email" placeholder="E-postadress" required autoComplete="email" />
            <PasswordInput
              name="password"
              visible={showSignUpPassword}
              onToggle={() => setShowSignUpPassword((value) => !value)}
              placeholder={passwordRequirementsText}
              required
              autoComplete="new-password"
              minLength={12}
              pattern="(?=.*[A-ZÅÄÖ])(?=.*[0-9])(?=.*[^A-Za-zÅÄÖåäö0-9\\s]).{12,}"
              title={passwordRequirementsText}
            />

            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Skapar konto…" : "Kom igång"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setMode("signin")}
              className="text-[13px] text-slate-600 hover:text-[#3b82f6] transition-colors font-medium"
            >
              Har du redan konto? Logga in
            </button>
          </div>

          <TrustBar />
        </>
      )}

      {/* RESET PASSWORD */}
      {mode === "reset" && (
        <>
          <div className="mb-8">
            <button
              onClick={() => setMode("signin")}
              className="text-[13px] text-slate-500 hover:text-[#3b82f6] transition-colors mb-6"
            >
              ← Tillbaka
            </button>
            <h2 className="text-[24px] font-bold tracking-tight text-[#0F172A]">Återställ lösenord</h2>
            <p className="text-sm text-slate-500 mt-1">Vi skickar en länk till din e-post</p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">
            <AuthInput name="email" type="email" placeholder="E-postadress" required autoComplete="email" />
            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Skickar…" : "Skicka återställningslänk"}
            </button>
          </form>
        </>
      )}

      {/* UPDATE PASSWORD */}
      {mode === "update" && (
        <>
          <div className="mb-8">
            <h2 className="text-[24px] font-bold tracking-tight text-[#0F172A]">Nytt lösenord</h2>
            <p className="text-sm text-slate-500 mt-1">Ange ditt nya lösenord nedan</p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            <PasswordInput
              name="newPassword"
              visible={showNewPassword}
              onToggle={() => setShowNewPassword((value) => !value)}
              placeholder={passwordRequirementsText}
              required
              autoComplete="new-password"
              minLength={12}
              pattern="(?=.*[A-ZÅÄÖ])(?=.*[0-9])(?=.*[^A-Za-zÅÄÖåäö0-9\\s]).{12,}"
              title={passwordRequirementsText}
            />
            <PasswordInput
              name="confirmPassword"
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
              placeholder="Bekräfta lösenord"
              required
              autoComplete="new-password"
              minLength={12}
            />
            <button type="submit" disabled={isSubmitting} className={primaryBtn}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Uppdaterar…" : "Uppdatera lösenord"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
};

export default Auth;
