-- Fix: registrering (signup) misslyckades med
-- "Authentication required to create a company".
--
-- Bakgrund: migration 20260610183048 lade till triggern set_company_created_by
-- på public.companies som kastar ett fel om auth.uid() är NULL. Men vid
-- registrering skapar handle_new_user() (SECURITY DEFINER) det första
-- företaget INNAN användaren har en aktiv session — auth.uid() är då NULL,
-- triggern kastar, hela signup-transaktionen rullas tillbaka och Supabase
-- svarar 500. Ingen ny användare har kunnat registrera sig sedan dess.
--
-- Fix: behåll säkerhetsinvarianten för direkta inserts (RLS kräver fortsatt
-- auth.uid() = created_by för rollen "authenticated"), men tillåt inserts där
-- created_by redan är satt av en SECURITY DEFINER-funktion (signup-flödet).

CREATE OR REPLACE FUNCTION public.set_company_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    -- Direkt insert av en inloggad användare: sätt/överskriv created_by.
    NEW.created_by := auth.uid();
  ELSIF NEW.created_by IS NULL THEN
    -- Ingen session OCH inget created_by angivet: neka.
    RAISE EXCEPTION 'Authentication required to create a company';
  END IF;
  -- Ingen session men created_by redan satt (signup-triggern): tillåt.
  RETURN NEW;
END;
$$;
